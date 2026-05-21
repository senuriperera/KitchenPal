const db = require('../config/database');

class NotificationModel {
  static async create({ branch_id, ingredient_id, type, message, expiry_date }) {
    const query = `
      INSERT INTO notifications (branch_id, ingredient_id, type, message, expiry_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [branch_id, ingredient_id, type, message, expiry_date];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async getAllByBranch(branch_id, is_resolved = false) {
    const query = `
      SELECT n.*, i.name as ingredient_name, i.quantity, i.expiry_date as ingredient_expiry
      FROM notifications n
      LEFT JOIN ingredients i ON n.ingredient_id = i.ingredient_id
      WHERE n.branch_id = $1 AND n.is_resolved = $2
      ORDER BY n.created_at DESC
    `;
    const result = await db.query(query, [branch_id, is_resolved]);
    return result.rows;
  }

  static async findById(notification_id) {
    const query = `
      SELECT n.*, i.name as ingredient_name, i.quantity, i.expiry_date as ingredient_expiry
      FROM notifications n
      LEFT JOIN ingredients i ON n.ingredient_id = i.ingredient_id
      WHERE n.notification_id = $1
    `;
    const result = await db.query(query, [notification_id]);
    return result.rows[0];
  }

  static async resolve(notification_id) {
    const query = `
      UPDATE notifications 
      SET is_resolved = true, resolved_at = NOW()
      WHERE notification_id = $1
      RETURNING *
    `;
    const result = await db.query(query, [notification_id]);
    return result.rows[0];
  }

  static async setGenerateRecipeRequested(notification_id, value = true) {
    const query = `
      UPDATE notifications 
      SET generate_recipe_requested = $1
      WHERE notification_id = $2
      RETURNING *
    `;
    const result = await db.query(query, [value, notification_id]);
    return result.rows[0];
  }

  static async delete(notification_id) {
    const query = 'DELETE FROM notifications WHERE notification_id = $1';
    await db.query(query, [notification_id]);
  }

  static async createExpiryNotifications(branch_id, days = 7) {
    const query = `
      INSERT INTO notifications (branch_id, ingredient_id, type, message, expiry_date)
      SELECT 
        i.branch_id,
        i.ingredient_id,
        'EXPIRING_SOON' as type,
        'Ingredient "' || i.name || '" is expiring on ' || i.expiry_date::text as message,
        i.expiry_date
      FROM ingredients i
      LEFT JOIN notifications n ON i.ingredient_id = n.ingredient_id 
        AND n.type = 'EXPIRING_SOON' 
        AND n.is_resolved = false
      WHERE i.branch_id = $1
        AND i.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * $2
        AND i.expiry_date >= CURRENT_DATE
        AND i.quantity > 0
        AND n.notification_id IS NULL
      RETURNING *
    `;
    const result = await db.query(query, [branch_id, days]);
    return result.rows;
  }
}

module.exports = NotificationModel;
