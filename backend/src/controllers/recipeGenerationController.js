const db = require('../config/database');

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

        const rawWords = selectedItems
            .flatMap((item) => (item.name || '').toLowerCase().split(/\s+/))
            .filter((w) => w && w.length > 2);

        const querySet = new Set(rawWords);
        if (querySet.size === 0) {
            return res.status(400).json({ error: 'No meaningful keywords from selected items' });
        }

        const queryWords = Array.from(querySet);

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

        const minDaysUntilExpiry = Math.min(
            ...selectedItems.map((i) => Number(i.days_until_expiry))
        );
        let suggestedDiscountPercent;
        if (minDaysUntilExpiry <= 1) suggestedDiscountPercent = 30;
        else if (minDaysUntilExpiry <= 2) suggestedDiscountPercent = 20;
        else suggestedDiscountPercent = 10;

        const detailsResult = await db.query(
            `SELECT
         r.recipe_id,
         r.name,
         r.image_url,
         r.cooking_time_minutes,
         r.description,
         r.base_price,
         r.total_servings
       FROM recipes r
       WHERE r.recipe_id = ANY($1)
         AND r.is_active = true`,
            [topRecipeIds]
        );

        const detailsById = new Map();
        for (const row of detailsResult.rows) {
            detailsById.set(row.recipe_id, row);
        }

        const availabilityResult = await db.query(
            `SELECT
         ri.recipe_id,
         ri.master_ingredient_id,
         ri.quantity_required,
         ri.is_optional,
         u.to_base_factor,
         si.total_base_quantity,
         si.ingredient_id AS stock_ingredient_id,
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

        const stockIngredientIdToMaster = new Map();
        if (selectedItems.length > 0) {
            const siIds = selectedItems.map((s) => s.ingredient_id).filter(Boolean);
            if (siIds.length > 0) {
                const siResult = await db.query(
                    `SELECT ingredient_id, master_ingredient_id FROM stock_ingredients WHERE ingredient_id = ANY($1)`,
                    [siIds]
                );
                for (const row of siResult.rows) {
                    stockIngredientIdToMaster.set(row.ingredient_id, row.master_ingredient_id);
                }
            }
        }

        const expiringByMaster = new Map();
        for (const item of selectedItems) {
            const masterId = stockIngredientIdToMaster.get(item.ingredient_id);
            if (masterId) {
                const existing = expiringByMaster.get(masterId) || 0;
                expiringByMaster.set(masterId, existing + Number(item.remaining_base_quantity || 0));
            }
        }

        const ingredientsByRecipe = new Map();
        for (const row of availabilityResult.rows) {
            if (!ingredientsByRecipe.has(row.recipe_id)) {
                ingredientsByRecipe.set(row.recipe_id, []);
            }
            ingredientsByRecipe.get(row.recipe_id).push(row);
        }

        const responseItems = [];
        for (const candidate of topCandidates) {
            const details = detailsById.get(candidate.recipeId);
            if (!details) continue;

            const totalServings = Number(details.total_servings) || 1;
            const rawIngredients = ingredientsByRecipe.get(candidate.recipeId) || [];

            let recipeIsInfeasible = true;
            let hasAtLeastOneNonOptional = false;
            let hasStockWarning = false;
            let suggestedServings = Infinity;

            const ingredientDetails = [];
            for (const row of rawIngredients) {
                const baseQtyTotal = Number(row.quantity_required) * Number(row.to_base_factor);
                const baseQtyPerServing = baseQtyTotal / totalServings;
                const totalAvailable = row.total_base_quantity != null ? Number(row.total_base_quantity) : 0;
                const expiringAvailable = expiringByMaster.get(row.master_ingredient_id) || 0;
                const isOptional = row.is_optional || false;

                let availabilityStatus;
                if (expiringAvailable >= baseQtyPerServing) {
                    availabilityStatus = 'sufficient_expiring';
                } else if (totalAvailable >= baseQtyPerServing) {
                    availabilityStatus = 'needs_non_expiring';
                } else {
                    availabilityStatus = 'insufficient';
                }

                if (!isOptional) {
                    hasAtLeastOneNonOptional = true;
                    if (availabilityStatus !== 'insufficient') {
                        recipeIsInfeasible = false;
                    }
                    if (availabilityStatus === 'needs_non_expiring') {
                        hasStockWarning = true;
                    }
                    if (baseQtyPerServing > 0) {
                        const servingsFromStock = Math.floor(totalAvailable / baseQtyPerServing);
                        suggestedServings = Math.min(suggestedServings, servingsFromStock);
                    }
                }

                ingredientDetails.push({
                    name: row.ingredient_name,
                    quantity_required: Number(row.quantity_required),
                    unit_code: row.unit_code,
                    available: availabilityStatus !== 'insufficient',
                    availability_status: availabilityStatus,
                    required_base_qty: parseFloat(baseQtyPerServing.toFixed(4)),
                    available_base_qty: parseFloat(totalAvailable.toFixed(4)),
                });
            }

            if (hasAtLeastOneNonOptional && recipeIsInfeasible) {
                continue;
            }

            if (!isFinite(suggestedServings) || suggestedServings <= 0) {
                suggestedServings = 1;
            }
            suggestedServings = Math.min(suggestedServings, 50);

            const coveragePercent = Math.min(100,
                Math.round((suggestedServings / totalServings) * 100)
            );

            const basePrice = Number(details.base_price);
            const suggestedDiscountPrice = parseFloat(
                (basePrice - (basePrice * suggestedDiscountPercent) / 100).toFixed(2)
            );

            const ingredientsAvailable = ingredientDetails.filter((i) => i.available).length;

            responseItems.push({
                recipe_id: details.recipe_id,
                name: details.name,
                image_url: details.image_url,
                cooking_time_minutes: details.cooking_time_minutes,
                description: details.description,
                base_price: basePrice,
                total_servings: totalServings,
                jaccard_score: Math.round(candidate.jaccardScore * 100),
                suggested_discount_percent: suggestedDiscountPercent,
                suggested_discount_price: suggestedDiscountPrice,
                ingredients_available: ingredientsAvailable,
                ingredients_total: ingredientDetails.length,
                suggested_servings: suggestedServings,
                coverage_percent: coveragePercent,
                has_stock_warning: hasStockWarning,
                warning_message: hasStockWarning ? 'Some ingredients require non-expiring stock' : null,
                ingredients: ingredientDetails,
            });
        }

        if (responseItems.length === 0) {
            return res.status(404).json({ error: 'No suitable recipes found' });
        }

        res.status(200).json({ recipes: responseItems });
    } catch (err) {
        console.error('Generate recipes error:', err);
        res.status(500).json({ error: 'Failed to generate recipes' });
    }
}

module.exports = {
    generateRecipes,
};
