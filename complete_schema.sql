-- ============================================================
-- KitchenPal Database Schema (UPDATED - v2)
-- ============================================================
-- Changes from v1:
--  - units: removed tsp, tbsp, cup
--  - units: added unit_family, base_unit_code, to_base_factor
--  - master_ingredients: added unit_family, base_unit_id
--  - stock_ingredients: added unit_weight, unit_weight_unit_id,
--                       total_base_quantity, base_unit_id
--  - ingredient_batches: added unit_weight, unit_weight_unit_id,
--                        remaining_base_quantity, base_unit_id
-- ============================================================
-- Tables included:
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
-- =======================
CREATE TABLE IF NOT EXISTS public.units (
    unit_id         SERIAL PRIMARY KEY,
    code            CHARACTER VARYING(20)  NOT NULL,
    name            CHARACTER VARYING(50)  NOT NULL,
    unit_family     CHARACTER VARYING(20)  NOT NULL CHECK (unit_family IN ('weight', 'volume', 'count')),
    base_unit_code  CHARACTER VARYING(20)  NOT NULL,
    to_base_factor  NUMERIC(12,6)          NOT NULL DEFAULT 1,
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
    user_id       SERIAL PRIMARY KEY,
    name          CHARACTER VARYING(150) NOT NULL,
    email         CHARACTER VARYING(255) NOT NULL,
    password_hash TEXT,
    role          CHARACTER VARYING(50) CHECK (role IN ('admin', 'branch_manager', 'staff')),
    branch_id     INTEGER REFERENCES public.branches(branch_id),
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login    TIMESTAMP WITH TIME ZONE,
    CONSTRAINT users_email_key UNIQUE (email)
    -- admin has NULL branch_id since they oversee all branches
);


-- =======================
-- 5. Sessions
-- =======================
CREATE TABLE IF NOT EXISTS public.sessions (
    session_id    SERIAL PRIMARY KEY,
    user_id       INTEGER REFERENCES public.users(user_id) ON DELETE CASCADE,
    jwt_token     TEXT NOT NULL,
    refresh_token TEXT,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at    TIMESTAMP WITH TIME ZONE,
    is_active     BOOLEAN DEFAULT TRUE,
    user_agent    TEXT,
    ip_address    TEXT
);


-- =======================
-- 6. Master Ingredients
-- (Global ingredient list, not branch-specific)
-- unit_family  : locks which unit family this ingredient uses everywhere
-- base_unit_id : the base unit for this ingredient's family (g, ml, or unit)
-- =======================
CREATE TABLE IF NOT EXISTS public.master_ingredients (
    master_ingredient_id SERIAL PRIMARY KEY,
    name                 CHARACTER VARYING(200) NOT NULL,
    default_unit_id      INTEGER REFERENCES public.units(unit_id),
    unit_family          CHARACTER VARYING(20)  NOT NULL CHECK (unit_family IN ('weight', 'volume', 'count')),
    base_unit_id         INTEGER REFERENCES public.units(unit_id),
    is_custom            BOOLEAN DEFAULT FALSE,
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT master_ingredients_name_key UNIQUE (name)
);


-- =======================
-- 7. Stock Ingredients
-- (Branch-specific inventory)
--
-- quantity_in_stock   : number of physical packets/units purchased (e.g. 5 packets)
-- unit_id             : unit for the packet count (almost always 'unit')
-- unit_weight         : weight/volume of ONE packet (e.g. 500)
-- unit_weight_unit_id : unit of that weight (e.g. g, kg, ml, l, shot)
-- total_base_quantity : STORED = quantity_in_stock * unit_weight * to_base_factor
--                       e.g. 5 packets * 500g * 1 = 2500g  <-- used for all deduction logic
-- base_unit_id        : unit that total_base_quantity is stored in (g, ml, or unit)
-- =======================
CREATE TABLE IF NOT EXISTS public.stock_ingredients (
    ingredient_id        SERIAL PRIMARY KEY,
    branch_id            INTEGER NOT NULL REFERENCES public.branches(branch_id),
    master_ingredient_id INTEGER NOT NULL REFERENCES public.master_ingredients(master_ingredient_id),
    name                 CHARACTER VARYING(200) NOT NULL,
    quantity_in_stock    NUMERIC(12,4) NOT NULL DEFAULT 0,   -- packet count
    unit_id              INTEGER REFERENCES public.units(unit_id),
    unit_weight          NUMERIC(12,4),                      -- weight per packet
    unit_weight_unit_id  INTEGER REFERENCES public.units(unit_id),
    total_base_quantity  NUMERIC(12,4) NOT NULL DEFAULT 0,   -- total in base unit (g/ml/unit)
    base_unit_id         INTEGER REFERENCES public.units(unit_id),
    manufacture_date     DATE,
    expiry_date          DATE,
    storage_type_id      INTEGER REFERENCES public.storage_types(storage_type_id),
    cost_per_unit        NUMERIC(10,4),
    price                NUMERIC(10,4),
    reorder_level        NUMERIC(12,4),
    image_url            TEXT,
    added_by             INTEGER REFERENCES public.users(user_id),
    added_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- =======================
-- 8. Ingredient Batches
-- (Tracks each purchase separately for FIFO deduction)
--
-- quantity                : original packet count when this batch was added
-- remaining_quantity      : remaining packet count (decremented only when full packet depleted)
-- unit_weight             : weight/volume of ONE packet in this batch
-- unit_weight_unit_id     : unit of that weight (g, kg, ml, l, shot)
-- remaining_base_quantity : STORED = what is left in base units (g/ml/unit)
--                           THIS IS WHAT GETS DEDUCTED ON EACH SALE (FIFO)
-- base_unit_id            : unit that remaining_base_quantity is stored in
-- =======================
CREATE TABLE IF NOT EXISTS public.ingredient_batches (
    batch_id                SERIAL PRIMARY KEY,
    ingredient_id           INTEGER NOT NULL REFERENCES public.stock_ingredients(ingredient_id) ON DELETE CASCADE,
    quantity                NUMERIC(12,4) NOT NULL,          -- original packet count
    remaining_quantity      NUMERIC(12,4) NOT NULL,          -- remaining packet count
    unit_weight             NUMERIC(12,4),                   -- weight per packet
    unit_weight_unit_id     INTEGER REFERENCES public.units(unit_id),
    remaining_base_quantity NUMERIC(12,4) NOT NULL,          -- remaining in base unit (g/ml/unit)
    base_unit_id            INTEGER REFERENCES public.units(unit_id),
    cost_per_unit           NUMERIC(10,4),
    manufacture_date        DATE,
    expiry_date             DATE NOT NULL,
    is_depleted             BOOLEAN DEFAULT FALSE,
    added_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- =======================
-- 9. Recipes
-- (Standard fixed recipes, branch_id is NULL for global recipes)
-- =======================
CREATE TABLE IF NOT EXISTS public.recipes (
    recipe_id            SERIAL PRIMARY KEY,
    branch_id            INTEGER REFERENCES public.branches(branch_id),
    name                 CHARACTER VARYING(200) NOT NULL,
    image_url            TEXT,
    cooking_time_minutes INTEGER,
    description          TEXT,
    base_price           NUMERIC(12,4) NOT NULL,
    is_generated         BOOLEAN DEFAULT FALSE,
    is_active            BOOLEAN DEFAULT TRUE,
    created_by           INTEGER REFERENCES public.users(user_id),
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- =======================
-- 10. Recipe Ingredients
-- (Links recipes to master ingredients)
-- unit_id must belong to the same unit_family as the master ingredient
-- quantity_required is stored in the selected unit (g or kg, ml or l or shot, unit)
-- at sale time backend converts to base unit using to_base_factor for deduction
-- =======================
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    recipe_ingredient_id SERIAL PRIMARY KEY,
    recipe_id            INTEGER NOT NULL REFERENCES public.recipes(recipe_id) ON DELETE CASCADE,
    master_ingredient_id INTEGER REFERENCES public.master_ingredients(master_ingredient_id),
    ingredient_id        INTEGER REFERENCES public.stock_ingredients(ingredient_id),
    -- ingredient_id is nullable because standard recipes use master_ingredient_id
    quantity_required    NUMERIC(12,4) NOT NULL,
    unit_id              INTEGER REFERENCES public.units(unit_id),
    is_optional          BOOLEAN DEFAULT FALSE,
    CONSTRAINT recipe_ingredients_unique UNIQUE (recipe_id, master_ingredient_id)
);


-- =======================
-- 11. Recipe Keywords
-- (Used for Jaccard Similarity keyword matching)
-- =======================
CREATE TABLE IF NOT EXISTS public.recipe_keywords (
    keyword_id SERIAL PRIMARY KEY,
    recipe_id  INTEGER NOT NULL REFERENCES public.recipes(recipe_id) ON DELETE CASCADE,
    keyword    CHARACTER VARYING(100) NOT NULL
);


-- =======================
-- 12. Generated Recipes
-- (Recipes suggested from expiry-nearing items, pending admin approval)
-- =======================
CREATE TABLE IF NOT EXISTS public.generated_recipes (
    generated_id             SERIAL PRIMARY KEY,
    branch_id                INTEGER NOT NULL REFERENCES public.branches(branch_id),
    recipe_id                INTEGER NOT NULL REFERENCES public.recipes(recipe_id),
    generated_by             INTEGER NOT NULL REFERENCES public.users(user_id),
    suggested_discount_percent NUMERIC(5,2) NOT NULL,
    suggested_discount_price   NUMERIC(10,2) NOT NULL,
    final_discount_percent     NUMERIC(5,2),
    final_discount_price       NUMERIC(10,2),
    status                   CHARACTER VARYING(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note               TEXT,
    reviewed_by              INTEGER REFERENCES public.users(user_id),
    reviewed_at              TIMESTAMP WITH TIME ZONE,
    is_active                BOOLEAN DEFAULT TRUE,
    created_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- =======================
-- 13. Generated Recipe Triggers
-- (Records which expiry-nearing items triggered the recipe generation)
-- =======================
CREATE TABLE IF NOT EXISTS public.generated_recipe_triggers (
    trigger_id   SERIAL PRIMARY KEY,
    generated_id INTEGER NOT NULL REFERENCES public.generated_recipes(generated_id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES public.stock_ingredients(ingredient_id),
    expiry_date  DATE NOT NULL
);


-- =======================
-- 14. Sales
-- (Recorded when staff clicks New Sale on a recipe)
-- =======================
CREATE TABLE IF NOT EXISTS public.sales (
    sale_id      SERIAL PRIMARY KEY,
    branch_id    INTEGER NOT NULL REFERENCES public.branches(branch_id),
    recipe_id    INTEGER NOT NULL REFERENCES public.recipes(recipe_id),
    generated_id INTEGER REFERENCES public.generated_recipes(generated_id),
    -- generated_id is NULL when sale is from a standard recipe
    sold_by      INTEGER NOT NULL REFERENCES public.users(user_id),
    sold_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- =======================
-- 15. Sale Deductions
-- (Tracks exactly which batch was deducted per sale for FIFO traceability)
-- quantity_deducted is always stored in base units (g, ml, or unit)
-- =======================
CREATE TABLE IF NOT EXISTS public.sale_deductions (
    deduction_id      SERIAL PRIMARY KEY,
    sale_id           INTEGER NOT NULL REFERENCES public.sales(sale_id) ON DELETE CASCADE,
    batch_id          INTEGER NOT NULL REFERENCES public.ingredient_batches(batch_id),
    quantity_deducted NUMERIC(12,4) NOT NULL  -- always in base units (g / ml / unit)
);


-- =======================
-- 16. Notifications
-- =======================
CREATE TABLE IF NOT EXISTS public.notifications (
    notification_id   SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    branch_id         INTEGER REFERENCES public.branches(branch_id),
    ingredient_id     INTEGER REFERENCES public.stock_ingredients(ingredient_id),
    title             CHARACTER VARYING(150) NOT NULL,
    message           TEXT NOT NULL,
    notification_type CHARACTER VARYING(50)
        CHECK (notification_type IN ('expiry_alert', 'recipe_pending', 'recipe_approved', 'recipe_rejected')),
    status            CHARACTER VARYING(20) DEFAULT 'unread'
        CHECK (status IN ('unread', 'read')),
    days_until_expiry INTEGER,
    is_read           BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at   TIMESTAMP WITH TIME ZONE
);


-- =======================
-- 17. Waste Logs
-- (Used to calculate wasted vs saved pie chart on home page)
-- quantity_wasted is stored in base units (g, ml, or unit)
-- =======================
CREATE TABLE IF NOT EXISTS public.waste_logs (
    waste_id         SERIAL PRIMARY KEY,
    branch_id        INTEGER NOT NULL REFERENCES public.branches(branch_id),
    ingredient_id    INTEGER NOT NULL REFERENCES public.stock_ingredients(ingredient_id),
    batch_id         INTEGER REFERENCES public.ingredient_batches(batch_id),
    quantity_wasted  NUMERIC(12,4) NOT NULL,  -- always in base units (g / ml / unit)
    unit_id          INTEGER REFERENCES public.units(unit_id),
    reason           CHARACTER VARYING(50)
        CHECK (reason IN ('expired', 'damaged', 'other')),
    logged_by        INTEGER NOT NULL REFERENCES public.users(user_id),
    logged_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ============================================================
-- SEED DATA
-- ============================================================

-- Units (tsp, tbsp, cup REMOVED)
-- to_base_factor: multiply quantity by this to get base unit value
INSERT INTO public.units (code, name, unit_family, base_unit_code, to_base_factor) VALUES
    ('g',    'Grams',       'weight', 'g',  1),
    ('kg',   'Kilograms',   'weight', 'g',  1000),
    ('ml',   'Milliliters', 'volume', 'ml', 1),
    ('l',    'Liters',      'volume', 'ml', 1000),
    ('shot', 'Shot',        'volume', 'ml', 45),
    ('unit', 'Unit',        'count',  'unit', 1)
ON CONFLICT (code) DO UPDATE
SET
    unit_family    = EXCLUDED.unit_family,
    base_unit_code = EXCLUDED.base_unit_code,
    to_base_factor = EXCLUDED.to_base_factor;

-- Remove old units no longer supported
DELETE FROM public.units WHERE code IN ('tsp', 'tbsp', 'cup');

-- Storage Types
INSERT INTO public.storage_types (code, name) VALUES
    ('FRIDGE',      'Refrigerator'),
    ('FREEZER',     'Freezer'),
    ('PANTRY',      'Pantry'),
    ('ROOM_TEMP',   'Room Temperature'),
    ('DRY_STORAGE', 'Dry Storage')
ON CONFLICT (code) DO NOTHING;

-- Default Admin User
-- Email: admin@kitchenpal.com
-- Password: admin123
INSERT INTO public.users (name, email, password_hash, role) VALUES (
    'Admin',
    'admin@kitchenpal.com',
    '$2a$10$tYP/vVZSoZY/CdF48sljpOdVFvD0RzkbWacxr/HE9K5Hse3xb9PSi',
    'admin'
)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash;


-- ============================================================
-- MIGRATION QUERIES (run these if upgrading from v1 schema)
-- ============================================================

-- Step 1: Add new columns to units
 ALTER TABLE public.units ADD COLUMN IF NOT EXISTS unit_family CHARACTER VARYING(20) CHECK (unit_family IN ('weight','volume','count'));
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS base_unit_code CHARACTER VARYING(20);
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS to_base_factor NUMERIC(12,6) DEFAULT 1;

-- Step 2: Populate unit columns
UPDATE public.units SET unit_family='weight', base_unit_code='g',    to_base_factor=1    WHERE code='g';
UPDATE public.units SET unit_family='weight', base_unit_code='g',    to_base_factor=1000 WHERE code='kg';
UPDATE public.units SET unit_family='volume', base_unit_code='ml',   to_base_factor=1    WHERE code='ml';
UPDATE public.units SET unit_family='volume', base_unit_code='ml',   to_base_factor=1000 WHERE code='l';
UPDATE public.units SET unit_family='volume', base_unit_code='ml',   to_base_factor=45   WHERE code='shot';
UPDATE public.units SET unit_family='count',  base_unit_code='unit', to_base_factor=1    WHERE code='unit';
DELETE FROM public.units WHERE code IN ('tsp','tbsp','cup');

-- Step 3: Add new columns to master_ingredients
ALTER TABLE public.master_ingredients ADD COLUMN IF NOT EXISTS unit_family CHARACTER VARYING(20) CHECK (unit_family IN ('weight','volume','count'));
ALTER TABLE public.master_ingredients ADD COLUMN IF NOT EXISTS base_unit_id INTEGER REFERENCES public.units(unit_id);

-- Step 4: Add new columns to stock_ingredients
ALTER TABLE public.stock_ingredients ADD COLUMN IF NOT EXISTS unit_weight NUMERIC(12,4);
ALTER TABLE public.stock_ingredients ADD COLUMN IF NOT EXISTS unit_weight_unit_id INTEGER REFERENCES public.units(unit_id);
ALTER TABLE public.stock_ingredients ADD COLUMN IF NOT EXISTS total_base_quantity NUMERIC(12,4) NOT NULL DEFAULT 0;
ALTER TABLE public.stock_ingredients ADD COLUMN IF NOT EXISTS base_unit_id INTEGER REFERENCES public.units(unit_id);

-- Step 5: Add new columns to ingredient_batches
ALTER TABLE public.ingredient_batches ADD COLUMN IF NOT EXISTS unit_weight NUMERIC(12,4);
ALTER TABLE public.ingredient_batches ADD COLUMN IF NOT EXISTS unit_weight_unit_id INTEGER REFERENCES public.units(unit_id);
ALTER TABLE public.ingredient_batches ADD COLUMN IF NOT EXISTS remaining_base_quantity NUMERIC(12,4) NOT NULL DEFAULT 0;
ALTER TABLE public.ingredient_batches ADD COLUMN IF NOT EXISTS base_unit_id INTEGER REFERENCES public.units(unit_id);


-- ============================================================
-- AUTO-CLEANUP: Delete generated recipes older than 1 month
-- Run this as a scheduled job / cron on your backend
-- ============================================================
-- DELETE FROM public.generated_recipes
-- WHERE created_at < NOW() - INTERVAL '1 month';