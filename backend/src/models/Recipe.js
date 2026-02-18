const db = require('../config/database');

class RecipeModel {
  // Create recipe
  static async create({ branch_id, name, image_url, cooking_time_minutes, description, base_price, is_generated, created_by }) {
    const query = `
      INSERT INTO recipes (branch_id, name, image_url, cooking_time_minutes, description, base_price, is_generated, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [branch_id, name, image_url, cooking_time_minutes, description, base_price, is_generated, created_by];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Get all recipes by branch (includes ingredients)
  static async getAllByBranch(branch_id, is_generated = null) {
    let query = `
      SELECT r.*,
        u.name as created_by_name,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'recipe_ingredient_id', ri.recipe_ingredient_id,
                'ingredient_id', ri.ingredient_id,
                'ingredient_name', i.name,
                'quantity_required', ri.quantity_required,
                'unit_id', ri.unit_id,
                'unit_code', un.code,
                'unit_name', un.name
              )
            )
            FROM recipe_ingredients ri
            JOIN ingredients i ON ri.ingredient_id = i.ingredient_id
            LEFT JOIN units un ON ri.unit_id = un.unit_id
            WHERE ri.recipe_id = r.recipe_id
          ),
          '[]'::json
        ) as ingredients
      FROM recipes r
      LEFT JOIN users u ON r.created_by = u.user_id
      WHERE r.branch_id = $1
    `;
    const values = [branch_id];

    if (is_generated !== null) {
      query += ' AND r.is_generated = $2';
      values.push(is_generated);
    }

    query += ' ORDER BY r.created_at DESC';

    const result = await db.query(query, values);
    return result.rows;
  }


  // Get recipe by ID with ingredients and steps
  static async findById(recipe_id) {
    const recipeQuery = `
      SELECT r.*, u.name as created_by_name
      FROM recipes r
      LEFT JOIN users u ON r.created_by = u.user_id
      WHERE r.recipe_id = $1
    `;
    const recipeResult = await db.query(recipeQuery, [recipe_id]);

    if (recipeResult.rows.length === 0) return null;

    const recipe = recipeResult.rows[0];

    // Get ingredients
    const ingredientsQuery = `
      SELECT ri.*, i.name as ingredient_name, u.code as unit_code, u.name as unit_name
      FROM recipe_ingredients ri
      JOIN ingredients i ON ri.ingredient_id = i.ingredient_id
      LEFT JOIN units u ON ri.unit_id = u.unit_id
      WHERE ri.recipe_id = $1
    `;
    const ingredientsResult = await db.query(ingredientsQuery, [recipe_id]);
    recipe.ingredients = ingredientsResult.rows;

    return recipe;
  }

  // Add ingredient to recipe
  static async addIngredient({ recipe_id, ingredient_id, quantity_required, unit_id }) {
    const query = `
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_required, unit_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await db.query(query, [recipe_id, ingredient_id, quantity_required, unit_id]);
    return result.rows[0];
  }

  // Add step to recipe
  static async addStep({ recipe_id, step_number, instruction }) {
    const query = `
      INSERT INTO recipe_steps (recipe_id, step_number, instruction)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await db.query(query, [recipe_id, step_number, instruction]);
    return result.rows[0];
  }

  // Add image to recipe
  static async addImage({ recipe_id, image_url, caption }) {
    const query = `
      INSERT INTO recipe_images (recipe_id, image_url, caption)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await db.query(query, [recipe_id, image_url, caption]);
    return result.rows[0];
  }

  // Update recipe
  static async update(recipe_id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) return null;

    values.push(recipe_id);
    const query = `
      UPDATE recipes 
      SET ${fields.join(', ')}
      WHERE recipe_id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Delete recipe
  static async delete(recipe_id) {
    const query = 'DELETE FROM recipes WHERE recipe_id = $1';
    await db.query(query, [recipe_id]);
  }

  // Find recipes that can be made with given ingredients
  static async findMatchingRecipes(branch_id, ingredient_ids) {
    const query = `
      SELECT DISTINCT r.*, 
        COUNT(ri.ingredient_id) as matching_ingredients,
        (SELECT COUNT(*) FROM recipe_ingredients WHERE recipe_id = r.recipe_id) as total_ingredients
      FROM recipes r
      JOIN recipe_ingredients ri ON r.recipe_id = ri.recipe_id
      WHERE r.branch_id = $1
        AND r.is_generated = false
        AND ri.ingredient_id = ANY($2::int[])
      GROUP BY r.recipe_id
      ORDER BY matching_ingredients DESC, r.cooking_time_minutes ASC
      LIMIT 10
    `;
    const result = await db.query(query, [branch_id, ingredient_ids]);
    return result.rows;
  }
}

module.exports = RecipeModel;
