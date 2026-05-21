const db = require('../config/database');

class RecipeModel {
    static async findById(recipe_id) {
        const query = `
            SELECT r.*,
                   b.name as branch_name,
                   u.name as created_by_name
            FROM recipes r
            LEFT JOIN branches b ON r.branch_id = b.branch_id
            LEFT JOIN users u ON r.created_by = u.user_id
            WHERE r.recipe_id = $1
        `;
        const result = await db.query(query, [recipe_id]);

        if (!result.rows[0]) {
            return null;
        }

        const ingredientsQuery = `
            SELECT ri.*,
                   mi.name as ingredient_name,
                   un.code as unit_code,
                   un.name as unit_name
            FROM recipe_ingredients ri
            LEFT JOIN master_ingredients mi ON ri.master_ingredient_id = mi.master_ingredient_id
            LEFT JOIN units un ON ri.unit_id = un.unit_id
            WHERE ri.recipe_id = $1
        `;
        const ingredientsResult = await db.query(ingredientsQuery, [recipe_id]);

        return {
            ...result.rows[0],
            ingredients: ingredientsResult.rows
        };
    }

    static async findMatchingRecipes(branch_id, ingredient_ids) {
        const query = `
            WITH recipe_matches AS (
                SELECT 
                    r.recipe_id,
                    r.name,
                    r.base_price,
                    r.cooking_time_minutes,
                    r.image_url,
                    COUNT(DISTINCT ri.master_ingredient_id) as total_ingredients,
                    COUNT(DISTINCT CASE 
                        WHEN si.ingredient_id = ANY($2::int[]) THEN ri.master_ingredient_id 
                    END) as matching_ingredients
                FROM recipes r
                JOIN recipe_ingredients ri ON r.recipe_id = ri.recipe_id
                LEFT JOIN stock_ingredients si ON ri.master_ingredient_id = si.master_ingredient_id
                WHERE r.is_active = true
                  AND (r.branch_id = $1 OR r.branch_id IS NULL)
                GROUP BY r.recipe_id, r.name, r.base_price, r.cooking_time_minutes, r.image_url
            )
            SELECT *,
                   ROUND((matching_ingredients::decimal / NULLIF(total_ingredients, 0)) * 100, 2) as match_percentage
            FROM recipe_matches
            WHERE matching_ingredients > 0
            ORDER BY match_percentage DESC, matching_ingredients DESC
            LIMIT 10
        `;
        const result = await db.query(query, [branch_id, ingredient_ids]);
        return result.rows;
    }

    static async getAllByBranch(branch_id) {
        const query = `
            SELECT r.*,
                   b.name as branch_name,
                   u.name as created_by_name
            FROM recipes r
            LEFT JOIN branches b ON r.branch_id = b.branch_id
            LEFT JOIN users u ON r.created_by = u.user_id
            WHERE r.branch_id = $1 OR r.branch_id IS NULL
            ORDER BY r.created_at DESC
        `;
        const result = await db.query(query, [branch_id]);
        return result.rows;
    }

    static async getAll() {
        const query = `
            SELECT r.*,
                   b.name as branch_name,
                   u.name as created_by_name
            FROM recipes r
            LEFT JOIN branches b ON r.branch_id = b.branch_id
            LEFT JOIN users u ON r.created_by = u.user_id
            ORDER BY r.created_at DESC
        `;
        const result = await db.query(query);
        return result.rows;
    }

    static async getAllStandardRecipes() {
        const query = `
            SELECT 
                r.recipe_id,
                r.name AS recipe_name,
                r.image_url,
                r.cooking_time_minutes,
                r.description,
                r.base_price,
                r.total_servings,
                r.serving_description,
                r.created_at,
                r.updated_at,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'master_ingredient_id', mi.master_ingredient_id,
                            'name', mi.name,
                            'quantity_required', ri.quantity_required,
                            'unit_code', u.code,
                            'unit_name', u.name,
                            'unit_id', u.unit_id
                        ) ORDER BY ri.recipe_ingredient_id
                    ) FILTER (WHERE mi.master_ingredient_id IS NOT NULL),
                    '[]'
                ) AS ingredients
            FROM recipes r
            LEFT JOIN recipe_ingredients ri ON r.recipe_id = ri.recipe_id
            LEFT JOIN master_ingredients mi ON ri.master_ingredient_id = mi.master_ingredient_id
            LEFT JOIN units u ON ri.unit_id = u.unit_id
            WHERE r.is_generated = false AND r.is_active = true
            GROUP BY r.recipe_id
            ORDER BY r.created_at DESC
        `;

        const result = await db.query(query);
        return result.rows;
    }

    static async getStandardRecipeById(recipeId) {
        const query = `
            SELECT 
                r.recipe_id,
                r.name AS recipe_name,
                r.image_url,
                r.cooking_time_minutes,
                r.description,
                r.base_price,
                r.total_servings,
                r.serving_description,
                r.created_at,
                r.updated_at,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'master_ingredient_id', mi.master_ingredient_id,
                            'name', mi.name,
                            'quantity_required', ri.quantity_required,
                            'unit_code', u.code,
                            'unit_name', u.name,
                            'unit_id', u.unit_id
                        ) ORDER BY ri.recipe_ingredient_id
                    ) FILTER (WHERE mi.master_ingredient_id IS NOT NULL),
                    '[]'
                ) AS ingredients
            FROM recipes r
            LEFT JOIN recipe_ingredients ri ON r.recipe_id = ri.recipe_id
            LEFT JOIN master_ingredients mi ON ri.master_ingredient_id = mi.master_ingredient_id
            LEFT JOIN units u ON ri.unit_id = u.unit_id
            WHERE r.recipe_id = $1 AND r.is_generated = false
            GROUP BY r.recipe_id
        `;

        const result = await db.query(query, [recipeId]);
        return result.rows[0];
    }

    static async create({ branch_id, name, image_url, cooking_time_minutes, description, base_price, is_generated, created_by }) {
        const query = `
            INSERT INTO recipes (branch_id, name, image_url, cooking_time_minutes, description, base_price, is_generated, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        const values = [branch_id, name, image_url, cooking_time_minutes, description, base_price, is_generated || false, created_by];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    static async createStandardRecipe(recipeData, ingredients) {
        const client = await db.getClient();

        try {
            await client.query('BEGIN');

            const recipeQuery = `
                INSERT INTO recipes (
                    name, image_url, cooking_time_minutes, description, 
                    base_price, is_generated, created_by, branch_id,
                    total_servings, serving_description
                )
                VALUES ($1, $2, $3, $4, $5, false, $6, NULL, $7, $8)
                RETURNING recipe_id, name, image_url, cooking_time_minutes, 
                          description, base_price, total_servings, serving_description,
                          created_at, updated_at
            `;

            const recipeResult = await client.query(recipeQuery, [
                recipeData.name,
                recipeData.image_url || null,
                recipeData.cooking_time_minutes || null,
                recipeData.description || null,
                recipeData.base_price,
                recipeData.created_by || null,
                recipeData.total_servings || 1,
                recipeData.serving_description || null,
            ]);

            const recipe = recipeResult.rows[0];
            const recipeId = recipe.recipe_id;

            if (ingredients && ingredients.length > 0) {
                const validationQuery = `
                    SELECT u.unit_family AS unit_unit_family,
                           mi.unit_family AS ingredient_unit_family,
                           mi.name AS ingredient_name,
                           u.name AS unit_name
                    FROM units u
                    CROSS JOIN master_ingredients mi
                    WHERE u.unit_id = $1
                    AND mi.master_ingredient_id = $2
                `;

                for (const ing of ingredients) {
                    const validationResult = await client.query(validationQuery, [
                        ing.unit_id,
                        ing.master_ingredient_id
                    ]);

                    if (validationResult.rows.length > 0) {
                        const { unit_unit_family, ingredient_unit_family, ingredient_name, unit_name } = validationResult.rows[0];
                        if (unit_unit_family && ingredient_unit_family && unit_unit_family !== ingredient_unit_family) {
                            await client.query('ROLLBACK');
                            const error = new Error(
                                `Unit mismatch: ${ingredient_name} is a ${ingredient_unit_family} ingredient but ${unit_name} was selected`
                            );
                            error.statusCode = 400;
                            throw error;
                        }
                    }
                }

                const ingredientQuery = `
                    INSERT INTO recipe_ingredients (
                        recipe_id, master_ingredient_id, quantity_required, unit_id
                    )
                    VALUES ($1, $2, $3, $4)
                `;

                for (const ing of ingredients) {
                    await client.query(ingredientQuery, [
                        recipeId,
                        ing.master_ingredient_id,
                        ing.quantity_required,
                        ing.unit_id
                    ]);
                }
            }

            const keywords = new Set();

            const recipeNameWords = recipeData.name.toLowerCase()
                .split(/\s+/)
                .filter(word => word.length > 2);
            recipeNameWords.forEach(word => keywords.add(word));

            if (ingredients && ingredients.length > 0) {
                for (const ing of ingredients) {
                    const ingNameQuery = `
                        SELECT name FROM master_ingredients 
                        WHERE master_ingredient_id = $1
                    `;
                    const ingResult = await client.query(ingNameQuery, [ing.master_ingredient_id]);

                    if (ingResult.rows[0]) {
                        const ingredientWords = ingResult.rows[0].name.toLowerCase()
                            .split(/\s+/)
                            .filter(word => word.length > 2);
                        ingredientWords.forEach(word => keywords.add(word));
                    }
                }
            }

            if (keywords.size > 0) {
                const keywordQuery = `
                    INSERT INTO recipe_keywords (recipe_id, keyword)
                    VALUES ($1, $2)
                `;

                for (const keyword of keywords) {
                    await client.query(keywordQuery, [recipeId, keyword]);
                }
            }

            await client.query('COMMIT');

            return recipe;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async update(recipe_id, { name, image_url, cooking_time_minutes, description, base_price, is_active }) {
        const query = `
            UPDATE recipes
            SET name = COALESCE($2, name),
                image_url = COALESCE($3, image_url),
                cooking_time_minutes = COALESCE($4, cooking_time_minutes),
                description = COALESCE($5, description),
                base_price = COALESCE($6, base_price),
                is_active = COALESCE($7, is_active),
                updated_at = NOW()
            WHERE recipe_id = $1
            RETURNING *
        `;
        const values = [recipe_id, name, image_url, cooking_time_minutes, description, base_price, is_active];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    static async updateWithIngredients(recipe_id, recipeData, ingredients) {
        const client = await db.getClient();

        try {
            console.log('Starting transaction for recipe update:', recipe_id);
            await client.query('BEGIN');

            const activeCheckResult = await client.query(
                'SELECT recipe_id, is_active FROM recipes WHERE recipe_id = $1 AND is_generated = false',
                [recipe_id]
            );
            if (activeCheckResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return null;
            }
            if (!activeCheckResult.rows[0].is_active) {
                await client.query('ROLLBACK');
                const error = new Error('Recipe is inactive and cannot be edited');
                error.statusCode = 404;
                throw error;
            }

            const recipeQuery = `
                UPDATE recipes
                SET name = $2,
                    image_url = $3,
                    cooking_time_minutes = $4,
                    description = $5,
                    base_price = $6,
                    total_servings = $7,
                    serving_description = $8,
                    updated_at = NOW()
                WHERE recipe_id = $1 AND is_generated = false AND is_active = true
                RETURNING recipe_id, name, image_url, cooking_time_minutes, 
                          description, base_price, total_servings, serving_description,
                          created_at, updated_at
            `;

            const recipeResult = await client.query(recipeQuery, [
                recipe_id,
                recipeData.name,
                recipeData.image_url || null,
                recipeData.cooking_time_minutes || null,
                recipeData.description || null,
                recipeData.base_price,
                recipeData.total_servings || 1,
                recipeData.serving_description || null,
            ]);

            if (recipeResult.rows.length === 0) {
                console.log('Recipe not found or is generated/inactive, rolling back:', recipe_id);
                await client.query('ROLLBACK');
                return null;
            }

            const recipe = recipeResult.rows[0];
            console.log('Recipe updated in DB:', recipe.recipe_id);

            const deleteIngredientsQuery = `
                DELETE FROM recipe_ingredients WHERE recipe_id = $1
            `;
            const deleteResult = await client.query(deleteIngredientsQuery, [recipe_id]);
            console.log('Deleted', deleteResult.rowCount, 'existing ingredients');

            if (ingredients && ingredients.length > 0) {
                const validationQuery = `
                    SELECT u.unit_family AS unit_unit_family,
                           mi.unit_family AS ingredient_unit_family,
                           mi.name AS ingredient_name,
                           u.name AS unit_name
                    FROM units u
                    CROSS JOIN master_ingredients mi
                    WHERE u.unit_id = $1
                    AND mi.master_ingredient_id = $2
                `;

                for (const ing of ingredients) {
                    const validationResult = await client.query(validationQuery, [
                        ing.unit_id,
                        ing.master_ingredient_id
                    ]);

                    if (validationResult.rows.length > 0) {
                        const { unit_unit_family, ingredient_unit_family, ingredient_name, unit_name } = validationResult.rows[0];
                        if (unit_unit_family !== ingredient_unit_family) {
                            await client.query('ROLLBACK');
                            const error = new Error(
                                `Unit mismatch: ${ingredient_name} is a ${ingredient_unit_family} ingredient but ${unit_name} was selected`
                            );
                            error.statusCode = 400;
                            throw error;
                        }
                    }
                }

                const ingredientQuery = `
                    INSERT INTO recipe_ingredients (
                        recipe_id, master_ingredient_id, quantity_required, unit_id
                    )
                    VALUES ($1, $2, $3, $4)
                `;

                for (const ing of ingredients) {
                    await client.query(ingredientQuery, [
                        recipe_id,
                        ing.master_ingredient_id,
                        ing.quantity_required,
                        ing.unit_id
                    ]);
                }
                console.log('Inserted', ingredients.length, 'new ingredients');
            }

            const deleteKeywordsQuery = `
                DELETE FROM recipe_keywords WHERE recipe_id = $1
            `;
            await client.query(deleteKeywordsQuery, [recipe_id]);

            const keywords = new Set();
            const recipeNameWords = recipeData.name.toLowerCase()
                .split(/\s+/)
                .filter(word => word.length > 2);
            recipeNameWords.forEach(word => keywords.add(word));

            if (ingredients && ingredients.length > 0) {
                for (const ing of ingredients) {
                    const ingNameQuery = `
                        SELECT name FROM master_ingredients 
                        WHERE master_ingredient_id = $1
                    `;
                    const ingResult = await client.query(ingNameQuery, [ing.master_ingredient_id]);

                    if (ingResult.rows[0]) {
                        const ingredientWords = ingResult.rows[0].name.toLowerCase()
                            .split(/\s+/)
                            .filter(word => word.length > 2);
                        ingredientWords.forEach(word => keywords.add(word));
                    }
                }
            }

            if (keywords.size > 0) {
                const keywordQuery = `
                    INSERT INTO recipe_keywords (recipe_id, keyword)
                    VALUES ($1, $2)
                `;

                for (const keyword of keywords) {
                    await client.query(keywordQuery, [recipe_id, keyword]);
                }
                console.log('Inserted', keywords.size, 'keywords');
            }

            await client.query('COMMIT');
            console.log('Transaction committed successfully for recipe:', recipe_id);

            return recipe;

        } catch (error) {
            console.error('Error in updateWithIngredients, rolling back:', error);
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async delete(recipe_id) {
        const query = `
            UPDATE recipes
            SET is_active = false,
                updated_at = NOW()
            WHERE recipe_id = $1 AND is_active = true
            RETURNING recipe_id
        `;
        const result = await db.query(query, [recipe_id]);
        return result.rows[0];
    }

    static async addIngredient(recipe_id, { master_ingredient_id, quantity_required, unit_id, is_optional }) {
        const query = `
            INSERT INTO recipe_ingredients (recipe_id, master_ingredient_id, quantity_required, unit_id, is_optional)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (recipe_id, master_ingredient_id) 
            DO UPDATE SET quantity_required = $3, unit_id = $4, is_optional = $5
            RETURNING *
        `;
        const values = [recipe_id, master_ingredient_id, quantity_required, unit_id, is_optional || false];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    static async removeIngredient(recipe_id, master_ingredient_id) {
        const query = 'DELETE FROM recipe_ingredients WHERE recipe_id = $1 AND master_ingredient_id = $2 RETURNING *';
        const result = await db.query(query, [recipe_id, master_ingredient_id]);
        return result.rows[0];
    }

    static async getIngredients(recipe_id) {
        const query = `
            SELECT ri.*,
                   mi.name as ingredient_name,
                   un.code as unit_code,
                   un.name as unit_name
            FROM recipe_ingredients ri
            LEFT JOIN master_ingredients mi ON ri.master_ingredient_id = mi.master_ingredient_id
            LEFT JOIN units un ON ri.unit_id = un.unit_id
            WHERE ri.recipe_id = $1
        `;
        const result = await db.query(query, [recipe_id]);
        return result.rows;
    }
}

module.exports = RecipeModel;
