const db = require('./src/config/database');
const IngredientModel = require('./src/models/Ingredient');

(async () => {
    try {
        const data = {
            master_ingredient_id: null,
            name: "Test Expiry Milk",
            quantity_in_stock: "2",
            unit_weight: "1000",
            unit_weight_unit_id: 3,
            price: "50",
            storage_type_id: 1,
            manufacture_date: "2026-03-01",
            expiry_date: "2026-03-16",
            image_url: null,
            added_by: 1,
            branch_id: 1
        };
        const result = await IngredientModel.createWithTransaction(data);
        console.log("SUCCESS:", result.name, "created.");
        const notifs = await db.query("SELECT * FROM notifications WHERE ingredient_id = $1", [result.ingredient_id]);
        console.log("NOTIFICATIONS GENERATED:", notifs.rows.length);
        console.log(notifs.rows);
    } catch (err) {
        console.error("ERROR:", err.message);
    } finally {
        process.exit();
    }
})();
