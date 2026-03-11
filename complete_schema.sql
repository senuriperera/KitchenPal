-- ============================================================
-- KitchenPal Database Schema (v3 - FINAL)
-- ============================================================
-- Changes from v2:
--  - stock_ingredients : removed cost_per_unit (price IS the cost per unit)
--  - stock_ingredients : removed reorder_level (not used)
--  - ingredient_batches: removed cost_per_unit
-- ============================================================
-- Tables:
--  1. branches
--  2. units
--  3. storage_types
--  4. users
--  5. sessions
--  6. master_ingredients
--  7. stock_ingredients
--  8. ingredient_batches
--  9. recipes
-- 10. recipe_ingredients
-- 11. recipe_keywords
-- 12. generated_recipes
-- 13. generated_recipe_triggers
-- 14. sales
-- 15. sale_deductions
-- 16. notifications
-- 17. waste_logs
-- ============================================================
-- =======================
-- 1. Branches
-- =======================
CREATE TABLE IF NOT EXISTS public.branches (
    branch_id SERIAL PRIMARY KEY,
    name CHARACTER VARYING(200) NOT NULL,
    location CHARACTER VARYING(500),
    contact_email CHARACTER VARYING(255),
    contact_phone CHARACTER VARYING(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- =======================
-- 2. Units
-- =======================
-- unit_family    : 'weight' | 'volume' | 'count'
-- base_unit_code : the base unit for that family (g, ml, unit)
-- to_base_factor : multiply by this to convert to base unit
--   e.g. kg -> to_base_factor=1000 means 1kg * 1000 = 1000g
--   e.g. shot -> to_base_factor=45  means 1shot * 45 = 45ml
-- =======================
CREATE TABLE IF NOT EXISTS public.units (
    unit_id SERIAL PRIMARY KEY,
    code CHARACTER VARYING(20) NOT NULL,
    name CHARACTER VARYING(50) NOT NULL,
    unit_family CHARACTER VARYING(20) NOT NULL CHECK (unit_family IN ('weight', 'volume', 'count')),
    base_unit_code CHARACTER VARYING(20) NOT NULL,
    to_base_factor NUMERIC(12, 6) NOT NULL DEFAULT 1,
    CONSTRAINT units_code_key UNIQUE (code)
);
-- =======================
-- 3. Storage Types
-- =======================
CREATE TABLE IF NOT EXISTS public.storage_types (
    storage_type_id SERIAL PRIMARY KEY,
    code CHARACTER VARYING(50) NOT NULL,
    name CHARACTER VARYING(100) NOT NULL,
    CONSTRAINT storage_types_code_key UNIQUE (code)
);
-- =======================
-- 4. Users
-- =======================
CREATE TABLE IF NOT EXISTS public.users (
    user_id SERIAL PRIMARY KEY,
    name CHARACTER VARYING(150) NOT NULL,
    email CHARACTER VARYING(255) NOT NULL,
    password_hash TEXT,
    role CHARACTER VARYING(50) CHECK (role IN ('admin', 'branch_manager', 'staff')),
    branch_id INTEGER REFERENCES public.branches(branch_id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    CONSTRAINT users_email_key UNIQUE (email) -- admin has NULL branch_id (oversees all branches)
);
-- =======================
-- 5. Sessions
-- =======================
CREATE TABLE IF NOT EXISTS public.sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(user_id) ON DELETE CASCADE,
    jwt_token TEXT NOT NULL,
    refresh_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    user_agent TEXT,
    ip_address TEXT
);
-- =======================
-- 6. Master Ingredients
-- (Global ingredient list, not branch-specific)
--
-- unit_family     : locks which unit family this ingredient uses everywhere
--                   weight = g/kg only | volume = ml/l/shot only | count = unit only
-- base_unit_id    : FK to units — the base unit for this ingredient's family
-- default_unit_id : FK to units — suggested display unit (e.g. g for coffee powder)
-- =======================
CREATE TABLE IF NOT EXISTS public.master_ingredients (
    master_ingredient_id SERIAL PRIMARY KEY,
    name CHARACTER VARYING(200) NOT NULL,
    unit_family CHARACTER VARYING(20) NOT NULL CHECK (unit_family IN ('weight', 'volume', 'count')),
    base_unit_id INTEGER REFERENCES public.units(unit_id),
    default_unit_id INTEGER REFERENCES public.units(unit_id),
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT master_ingredients_name_key UNIQUE (name)
);
-- =======================
-- 7. Stock Ingredients
-- (Branch-specific inventory)
--
-- quantity_in_stock   : number of physical packets/units purchased (e.g. 5 packets)
-- unit_weight         : weight/volume of ONE packet (e.g. 500)
-- unit_weight_unit_id : unit of that weight — must match master ingredient unit_family
--                       (e.g. g or kg for weight-family ingredient)
-- total_base_quantity : STORED = quantity_in_stock * unit_weight * to_base_factor
--                       e.g. 5 * 500g * 1 = 2500g
--                       THIS IS THE FIELD USED FOR ALL DEDUCTION LOGIC
-- base_unit_id        : FK to units — the unit total_base_quantity is stored in (g/ml/unit)
-- price               : price of ONE packet (cost per unit)
-- image_url           : Cloudinary hosted URL
-- =======================
CREATE TABLE IF NOT EXISTS public.stock_ingredients (
    ingredient_id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES public.branches(branch_id),
    master_ingredient_id INTEGER NOT NULL REFERENCES public.master_ingredients(master_ingredient_id),
    name CHARACTER VARYING(200) NOT NULL,
    quantity_in_stock NUMERIC(12, 4) NOT NULL DEFAULT 0,
    unit_weight NUMERIC(12, 4),
    unit_weight_unit_id INTEGER REFERENCES public.units(unit_id),
    total_base_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0,
    base_unit_id INTEGER REFERENCES public.units(unit_id),
    manufacture_date DATE,
    expiry_date DATE,
    storage_type_id INTEGER REFERENCES public.storage_types(storage_type_id),
    price NUMERIC(10, 4),
    image_url TEXT,
    added_by INTEGER REFERENCES public.users(user_id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- =======================
-- 8. Ingredient Batches
-- (Each purchase = one batch row. Used for FIFO deduction.)
--
-- quantity                : original packet count when this batch was added
-- remaining_quantity      : remaining packet count (decremented only when full packet depleted)
-- unit_weight             : weight/volume of ONE packet in this batch
-- unit_weight_unit_id     : unit of that weight (g, kg, ml, l, shot)
-- remaining_base_quantity : STORED remaining amount in base units (g/ml/unit)
--                           THIS IS WHAT GETS DEDUCTED ON EACH SALE (FIFO order by expiry_date ASC)
-- base_unit_id            : unit that remaining_base_quantity is stored in
-- =======================
CREATE TABLE IF NOT EXISTS public.ingredient_batches (
    batch_id SERIAL PRIMARY KEY,
    ingredient_id INTEGER NOT NULL REFERENCES public.stock_ingredients(ingredient_id) ON DELETE CASCADE,
    quantity NUMERIC(12, 4) NOT NULL,
    remaining_quantity NUMERIC(12, 4) NOT NULL,
    unit_weight NUMERIC(12, 4),
    unit_weight_unit_id INTEGER REFERENCES public.units(unit_id),
    remaining_base_quantity NUMERIC(12, 4) NOT NULL,
    base_unit_id INTEGER REFERENCES public.units(unit_id),
    manufacture_date DATE,
    expiry_date DATE NOT NULL,
    is_depleted BOOLEAN DEFAULT FALSE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- =======================
-- 9. Recipes
-- (branch_id is NULL for global/standard recipes)
-- =======================
CREATE TABLE IF NOT EXISTS public.recipes (
    recipe_id SERIAL PRIMARY KEY,
    branch_id INTEGER REFERENCES public.branches(branch_id),
    name CHARACTER VARYING(200) NOT NULL,
    image_url TEXT,
    cooking_time_minutes INTEGER,
    description TEXT,
    base_price NUMERIC(12, 4) NOT NULL,
    is_generated BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES public.users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- =======================
-- 10. Recipe Ingredients
-- (Links recipes to master ingredients)
--
-- unit_id must belong to the same unit_family as the master ingredient
-- quantity_required stored in the selected unit (g/kg, ml/l/shot, unit)
-- at sale time backend converts quantity_required to base unit using to_base_factor
-- =======================
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    recipe_ingredient_id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES public.recipes(recipe_id) ON DELETE CASCADE,
    master_ingredient_id INTEGER REFERENCES public.master_ingredients(master_ingredient_id),
    ingredient_id INTEGER REFERENCES public.stock_ingredients(ingredient_id),
    quantity_required NUMERIC(12, 4) NOT NULL,
    unit_id INTEGER REFERENCES public.units(unit_id),
    is_optional BOOLEAN DEFAULT FALSE,
    CONSTRAINT recipe_ingredients_unique UNIQUE (recipe_id, master_ingredient_id)
);
-- =======================
-- 11. Recipe Keywords
-- (Used for Jaccard Similarity keyword matching during recipe generation)
-- =======================
CREATE TABLE IF NOT EXISTS public.recipe_keywords (
    keyword_id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES public.recipes(recipe_id) ON DELETE CASCADE,
    keyword CHARACTER VARYING(100) NOT NULL
);
-- =======================
-- 12. Generated Recipes
-- (Recipes suggested from expiry-nearing items, pending admin approval)
-- =======================
CREATE TABLE IF NOT EXISTS public.generated_recipes (
    generated_id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES public.branches(branch_id),
    recipe_id INTEGER NOT NULL REFERENCES public.recipes(recipe_id),
    generated_by INTEGER NOT NULL REFERENCES public.users(user_id),
    suggested_discount_percent NUMERIC(5, 2) NOT NULL,
    suggested_discount_price NUMERIC(10, 2) NOT NULL,
    final_discount_percent NUMERIC(5, 2),
    final_discount_price NUMERIC(10, 2),
    status CHARACTER VARYING(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note TEXT,
    reviewed_by INTEGER REFERENCES public.users(user_id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- =======================
-- 13. Generated Recipe Triggers
-- (Records which expiry-nearing items triggered the recipe generation)
-- =======================
CREATE TABLE IF NOT EXISTS public.generated_recipe_triggers (
    trigger_id SERIAL PRIMARY KEY,
    generated_id INTEGER NOT NULL REFERENCES public.generated_recipes(generated_id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES public.stock_ingredients(ingredient_id),
    expiry_date DATE NOT NULL
);
-- =======================
-- 14. Sales
-- (Recorded when staff clicks New Sale on a recipe)
-- generated_id is NULL when sale is from a standard recipe
-- =======================
CREATE TABLE IF NOT EXISTS public.sales (
    sale_id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES public.branches(branch_id),
    recipe_id INTEGER NOT NULL REFERENCES public.recipes(recipe_id),
    generated_id INTEGER REFERENCES public.generated_recipes(generated_id),
    sold_by INTEGER NOT NULL REFERENCES public.users(user_id),
    sold_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- =======================
-- 15. Sale Deductions
-- (Tracks exactly which batch was deducted per sale — FIFO traceability)
-- quantity_deducted is ALWAYS stored in base units (g, ml, or unit)
-- =======================
CREATE TABLE IF NOT EXISTS public.sale_deductions (
    deduction_id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES public.sales(sale_id) ON DELETE CASCADE,
    batch_id INTEGER NOT NULL REFERENCES public.ingredient_batches(batch_id),
    quantity_deducted NUMERIC(12, 4) NOT NULL
);
-- =======================
-- 16. Notifications
-- =======================
CREATE TABLE IF NOT EXISTS public.notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    branch_id INTEGER REFERENCES public.branches(branch_id),
    ingredient_id INTEGER REFERENCES public.stock_ingredients(ingredient_id),
    title CHARACTER VARYING(150) NOT NULL,
    message TEXT NOT NULL,
    notification_type CHARACTER VARYING(50) CHECK (
        notification_type IN (
            'expiry_alert',
            'recipe_pending',
            'recipe_approved',
            'recipe_rejected'
        )
    ),
    status CHARACTER VARYING(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
    days_until_expiry INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE
);
-- =======================
-- 17. Waste Logs
-- (Used to calculate wasted vs saved pie chart on home page)
-- quantity_wasted is ALWAYS stored in base units (g, ml, or unit)
-- =======================
CREATE TABLE IF NOT EXISTS public.waste_logs (
    waste_id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES public.branches(branch_id),
    ingredient_id INTEGER NOT NULL REFERENCES public.stock_ingredients(ingredient_id),
    batch_id INTEGER REFERENCES public.ingredient_batches(batch_id),
    quantity_wasted NUMERIC(12, 4) NOT NULL,
    unit_id INTEGER REFERENCES public.units(unit_id),
    reason CHARACTER VARYING(50) CHECK (reason IN ('expired', 'damaged', 'other')),
    logged_by INTEGER NOT NULL REFERENCES public.users(user_id),
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- ============================================================
-- SEED DATA
-- ============================================================
-- Units
-- tsp, tbsp, cup are NOT included (removed from system)
INSERT INTO public.units (
        code,
        name,
        unit_family,
        base_unit_code,
        to_base_factor
    )
VALUES ('g', 'Grams', 'weight', 'g', 1),
    ('kg', 'Kilograms', 'weight', 'g', 1000),
    ('ml', 'Milliliters', 'volume', 'ml', 1),
    ('l', 'Liters', 'volume', 'ml', 1000),
    ('shot', 'Shot', 'volume', 'ml', 45),
    ('unit', 'Unit', 'count', 'unit', 1) ON CONFLICT (code) DO
UPDATE
SET unit_family = EXCLUDED.unit_family,
    base_unit_code = EXCLUDED.base_unit_code,
    to_base_factor = EXCLUDED.to_base_factor;
-- Storage Types
INSERT INTO public.storage_types (code, name)
VALUES ('FRIDGE', 'Refrigerator'),
    ('FREEZER', 'Freezer'),
    ('PANTRY', 'Pantry'),
    ('ROOM_TEMP', 'Room Temperature'),
    ('DRY_STORAGE', 'Dry Storage') ON CONFLICT (code) DO NOTHING;
-- Default Admin User
-- Email: admin@kitchenpal.com  |  Password: admin123
INSERT INTO public.users (name, email, password_hash, role)
VALUES (
        'Admin',
        'admin@kitchenpal.com',
        '$2a$10$tYP/vVZSoZY/CdF48sljpOdVFvD0RzkbWacxr/HE9K5Hse3xb9PSi',
        'admin'
    ) ON CONFLICT (email) DO
UPDATE
SET password_hash = EXCLUDED.password_hash;
-- ============================================================
-- MIGRATION QUERIES (run if upgrading from v2 schema)
-- ============================================================
-- Drop removed columns
ALTER TABLE public.stock_ingredients DROP COLUMN IF EXISTS cost_per_unit;
ALTER TABLE public.stock_ingredients DROP COLUMN IF EXISTS reorder_level;
ALTER TABLE public.ingredient_batches DROP COLUMN IF EXISTS cost_per_unit;
-- Add name column if missing (added in v3 schema)
ALTER TABLE public.stock_ingredients
ADD COLUMN IF NOT EXISTS name CHARACTER VARYING(200);
-- ============================================================
-- MIGRATION QUERIES (run if upgrading from v2 schema)
-- ============================================================
-- Drop removed columns
ALTER TABLE public.stock_ingredients DROP COLUMN IF EXISTS cost_per_unit;
ALTER TABLE public.stock_ingredients DROP COLUMN IF EXISTS reorder_level;
ALTER TABLE public.ingredient_batches DROP COLUMN IF EXISTS cost_per_unit;
-- Add name column if missing (added in v3 schema)
ALTER TABLE public.stock_ingredients
ADD COLUMN IF NOT EXISTS name CHARACTER VARYING(200);
-- ============================================================
-- AUTO-CLEANUP: Delete generated recipes older than 1 month
-- Run as a scheduled job / cron on your backend
-- ============================================================
-- DELETE FROM public.generated_recipes
-- WHERE created_at < NOW() - INTERVAL '1 month';