CREATE TABLE IF NOT EXISTS public.branches (
    branch_id SERIAL PRIMARY KEY,
    name CHARACTER VARYING(200) NOT NULL,
    location CHARACTER VARYING(500),
    contact_email CHARACTER VARYING(255),
    contact_phone CHARACTER VARYING(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.units (
    unit_id SERIAL PRIMARY KEY,
    code CHARACTER VARYING(20) NOT NULL,
    name CHARACTER VARYING(50) NOT NULL,
    unit_family CHARACTER VARYING(20) NOT NULL CHECK (unit_family IN ('weight', 'volume', 'count')),
    base_unit_code CHARACTER VARYING(20) NOT NULL,
    to_base_factor NUMERIC(12, 6) NOT NULL DEFAULT 1,
    CONSTRAINT units_code_key UNIQUE (code)
);
CREATE TABLE IF NOT EXISTS public.storage_types (
    storage_type_id SERIAL PRIMARY KEY,
    code CHARACTER VARYING(50) NOT NULL,
    name CHARACTER VARYING(100) NOT NULL,
    CONSTRAINT storage_types_code_key UNIQUE (code)
);
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
    CONSTRAINT users_email_key UNIQUE (email)
);
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
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP DEFAULT NULL
);
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
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP DEFAULT NULL
);
CREATE TABLE IF NOT EXISTS public.recipes (
    recipe_id SERIAL PRIMARY KEY,
    branch_id INTEGER REFERENCES public.branches(branch_id),
    name CHARACTER VARYING(200) NOT NULL,
    image_url TEXT,
    cooking_time_minutes INTEGER,
    description TEXT,
    base_price NUMERIC(12, 4) NOT NULL,
    total_servings INTEGER NOT NULL DEFAULT 1,
    serving_description CHARACTER VARYING(100),
    is_generated BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES public.users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
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
CREATE TABLE IF NOT EXISTS public.recipe_keywords (
    keyword_id SERIAL PRIMARY KEY,
    recipe_id INTEGER NOT NULL REFERENCES public.recipes(recipe_id) ON DELETE CASCADE,
    keyword CHARACTER VARYING(100) NOT NULL
);
CREATE TABLE IF NOT EXISTS public.generated_recipes (
    generated_id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES public.branches(branch_id),
    recipe_id INTEGER NOT NULL REFERENCES public.recipes(recipe_id),
    generated_by INTEGER NOT NULL REFERENCES public.users(user_id),
    suggested_discount_percent NUMERIC(5, 2) NOT NULL,
    suggested_discount_price NUMERIC(10, 2) NOT NULL,
    suggested_servings INTEGER NOT NULL DEFAULT 1,
    final_discount_percent NUMERIC(5, 2),
    final_discount_price NUMERIC(10, 2),
    status CHARACTER VARYING(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note TEXT,
    reviewed_by INTEGER REFERENCES public.users(user_id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.generated_recipe_triggers (
    trigger_id SERIAL PRIMARY KEY,
    generated_id INTEGER NOT NULL REFERENCES public.generated_recipes(generated_id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES public.stock_ingredients(ingredient_id),
    expiry_date DATE NOT NULL
);
CREATE TABLE IF NOT EXISTS public.sales (
    sale_id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES public.branches(branch_id),
    recipe_id INTEGER NOT NULL REFERENCES public.recipes(recipe_id),
    generated_id INTEGER REFERENCES public.generated_recipes(generated_id),
    quantity_sold INTEGER NOT NULL DEFAULT 1,
    base_price_per_unit NUMERIC(12, 4),
    total_revenue NUMERIC(12, 4),
    sold_by INTEGER NOT NULL REFERENCES public.users(user_id),
    sold_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.sale_deductions (
    deduction_id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES public.sales(sale_id) ON DELETE CASCADE,
    batch_id INTEGER NOT NULL REFERENCES public.ingredient_batches(batch_id),
    quantity_deducted NUMERIC(12, 4) NOT NULL
);
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
CREATE INDEX IF NOT EXISTS stock_ingredients_deleted_at_idx ON public.stock_ingredients(deleted_at);
CREATE INDEX IF NOT EXISTS ingredient_batches_deleted_at_idx ON public.ingredient_batches(deleted_at);
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
INSERT INTO public.storage_types (code, name)
VALUES ('FRIDGE', 'Refrigerator'),
    ('FREEZER', 'Freezer'),
    ('PANTRY', 'Pantry'),
    ('ROOM_TEMP', 'Room Temperature'),
    ('DRY_STORAGE', 'Dry Storage') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.users (name, email, password_hash, role)
VALUES (
        'Admin',
        'admin@kitchenpal.com',
        '$2a$10$tYP/vVZSoZY/CdF48sljpOdVFvD0RzkbWacxr/HE9K5Hse3xb9PSi',
        'admin'
    ) ON CONFLICT (email) DO
UPDATE
SET password_hash = EXCLUDED.password_hash;
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS quantity_sold INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS base_price_per_unit NUMERIC(12, 4);
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS total_revenue NUMERIC(12, 4);
ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS total_servings INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS serving_description CHARACTER VARYING(100);
ALTER TABLE public.generated_recipes
ADD COLUMN IF NOT EXISTS suggested_servings INTEGER NOT NULL DEFAULT 1;