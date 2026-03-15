const db = require('../config/database');

/**
 * POST /api/recipes/generate
 *
 * Body:
 * {
 *   selected_items: [
 *     { batch_id, ingredient_id, name, days_until_expiry }, ...
 *   ]
 * }
 *
 * Uses Jaccard similarity over recipe_keywords to find matching recipes,
 * checks ingredient availability, computes suggested discounts, and
 * returns a ranked list of suggestions. Does not persist anything.
 */
async function generateRecipes(req, res) {
    try {
        const { selected_items: selectedItems } = req.body || {};

        if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
            return res.status(400).json({ error: 'selected_items array is required' });
        }

        const branchId = req.user.branch_id;
        if (!branchId) {
            return res.status(400).json({ error: 'No branch associated with this account' });
        }

        // Step 1 — Build query word set from names
        const rawWords = selectedItems
            .flatMap((item) => (item.name || '').toLowerCase().split(/\s+/))
            .filter((w) => w && w.length > 2);

        const querySet = new Set(rawWords);
        if (querySet.size === 0) {
            return res.status(400).json({ error: 'No meaningful keywords from selected items' });
        }

        const queryWords = Array.from(querySet);

        // Step 2 — Find matching recipes from recipe_keywords
        const matchingResult = await db.query(
            `SELECT
         rk.recipe_id,
         COUNT(rk.keyword) AS match_count,
         ARRAY_AGG(rk.keyword) AS matched_keywords
       FROM recipe_keywords rk
       JOIN recipes r ON rk.recipe_id = r.recipe_id
       WHERE LOWER(rk.keyword) = ANY($1)
         AND r.is_active = true
         AND r.is_generated = false
       GROUP BY rk.recipe_id
       ORDER BY match_count DESC
       LIMIT 10`,
            [queryWords]
        );

        if (matchingResult.rows.length === 0) {
            return res.status(404).json({ error: 'No matching recipes found' });
        }

        // Step 3 — Calculate Jaccard score for each matched recipe
        const candidateRecipeIds = matchingResult.rows.map((r) => r.recipe_id);

        const keywordsByRecipe = new Map();
        const keywordsResult = await db.query(
            `SELECT recipe_id, keyword
       FROM recipe_keywords
       WHERE recipe_id = ANY($1)`,
            [candidateRecipeIds]
        );
        for (const row of keywordsResult.rows) {
            if (!keywordsByRecipe.has(row.recipe_id)) {
                keywordsByRecipe.set(row.recipe_id, new Set());
            }
            keywordsByRecipe.get(row.recipe_id).add(row.keyword.toLowerCase());
        }

        const queryArray = Array.from(querySet);

        const jaccardCandidates = [];
        for (const row of matchingResult.rows) {
            const recipeId = row.recipe_id;
            const recipeKeywordSet = keywordsByRecipe.get(recipeId) || new Set();
            const intersectionCount = queryArray.filter((w) => recipeKeywordSet.has(w)).length;
            const unionSize = new Set([...queryArray, ...recipeKeywordSet]).size;
            const jaccardScore = unionSize === 0 ? 0 : intersectionCount / unionSize;
            if (jaccardScore >= 0.1) {
                jaccardCandidates.push({ recipeId, jaccardScore });
            }
        }

        if (jaccardCandidates.length === 0) {
            return res.status(404).json({ error: 'No recipes met Jaccard threshold' });
        }

        jaccardCandidates.sort((a, b) => b.jaccardScore - a.jaccardScore);
        const topCandidates = jaccardCandidates.slice(0, 5);
        const topRecipeIds = topCandidates.map((c) => c.recipeId);

        // Step 4 — Check ingredient availability at this branch
        const availabilityByRecipe = new Map();
        const availabilityResult = await db.query(
            `SELECT
         ri.recipe_id,
         ri.master_ingredient_id,
         ri.quantity_required,
         ri.unit_id,
         u.to_base_factor,
         si.total_base_quantity,
         mi.name AS ingredient_name,
         u.code AS unit_code
       FROM recipe_ingredients ri
       JOIN units u ON ri.unit_id = u.unit_id
       JOIN master_ingredients mi ON ri.master_ingredient_id = mi.master_ingredient_id
       LEFT JOIN stock_ingredients si ON si.master_ingredient_id = ri.master_ingredient_id
         AND si.branch_id = $1
       WHERE ri.recipe_id = ANY($2)`,
            [branchId, topRecipeIds]
        );

        for (const row of availabilityResult.rows) {
            const {
                recipe_id,
                ingredient_name,
                quantity_required,
                to_base_factor,
                total_base_quantity,
                unit_code,
            } = row;
            const requiredBase = Number(quantity_required) * Number(to_base_factor);
            const availableBase = total_base_quantity != null ? Number(total_base_quantity) : 0;
            const isAvailable = availableBase >= requiredBase;

            if (!availabilityByRecipe.has(recipe_id)) {
                availabilityByRecipe.set(recipe_id, []);
            }
            availabilityByRecipe.get(recipe_id).push({
                name: ingredient_name,
                quantity_required: Number(quantity_required),
                unit_code,
                is_available: isAvailable,
            });
        }

        // Step 5 — Calculate suggested discount based on most urgent expiry
        const minDaysUntilExpiry = Math.min(
            ...selectedItems.map((i) => Number(i.days_until_expiry))
        );
        let suggestedDiscountPercent;
        if (minDaysUntilExpiry <= 1) suggestedDiscountPercent = 30;
        else if (minDaysUntilExpiry <= 2) suggestedDiscountPercent = 20;
        else suggestedDiscountPercent = 10;

        // Step 6 — Fetch full recipe details for top candidates
        const detailsResult = await db.query(
            `SELECT
         r.recipe_id,
         r.name,
         r.image_url,
         r.cooking_time_minutes,
         r.description,
         r.base_price
       FROM recipes r
       WHERE r.recipe_id = ANY($1)
         AND r.is_active = true`,
            [topRecipeIds]
        );

        const detailsById = new Map();
        for (const row of detailsResult.rows) {
            detailsById.set(row.recipe_id, row);
        }

        // Step 7 — Build response array
        const responseItems = [];
        for (const candidate of topCandidates) {
            const details = detailsById.get(candidate.recipeId);
            if (!details) continue;

            const ingredients = availabilityByRecipe.get(candidate.recipeId) || [];
            const ingredientsTotal = ingredients.length;
            const ingredientsAvailable = ingredients.filter((i) => i.is_available).length;

            const basePrice = Number(details.base_price);
            const suggestedDiscountPrice = parseFloat(
                (basePrice - (basePrice * suggestedDiscountPercent) / 100).toFixed(2)
            );

            responseItems.push({
                recipe_id: details.recipe_id,
                name: details.name,
                image_url: details.image_url,
                cooking_time_minutes: details.cooking_time_minutes,
                description: details.description,
                base_price: basePrice,
                jaccard_score: Math.round(candidate.jaccardScore * 100),
                suggested_discount_percent: suggestedDiscountPercent,
                suggested_discount_price: suggestedDiscountPrice,
                ingredients_available: ingredientsAvailable,
                ingredients_total: ingredientsTotal,
                ingredients,
            });
        }

        if (responseItems.length === 0) {
            return res.status(404).json({ error: 'No suitable recipes found' });
        }

        // Highest Jaccard already first due to sorting
        res.status(200).json({ recipes: responseItems });
    } catch (err) {
        console.error('Generate recipes error:', err);
        res.status(500).json({ error: 'Failed to generate recipes' });
    }
}

module.exports = {
    generateRecipes,
};
