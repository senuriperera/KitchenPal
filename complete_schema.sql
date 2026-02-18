-- KitchenPal Database Schema (FINAL UPDATED)
-- Changes Applied:
-- 1. Removed google_id from users
-- 2. Removed weight & weight_unit_id from ingredients
-- 3. Removed recipe_steps table
-- 4. Removed recipe_images table
-- 5. Updated units seed data (added tsp, tbsp, cup, shot, unit)
-- =======================
-- Create Branches table
-- =======================
CREATE TABLE IF NOT EXISTS public.branches (
    branch_id integer NOT NULL,
    name character varying(200) NOT NULL,
    location character varying(500),
    contact_email character varying(255),
    contact_phone character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT branches_pkey PRIMARY KEY (branch_id)
);
CREATE SEQUENCE IF NOT EXISTS public.branches_branch_id_seq AS integer START WITH 1 INCREMENT BY 1;
ALTER SEQUENCE public.branches_branch_id_seq OWNED BY public.branches.branch_id;
ALTER TABLE ONLY public.branches
ALTER COLUMN branch_id
SET DEFAULT nextval('public.branches_branch_id_seq'::regclass);
-- =======================
-- Create Units table
-- =======================
CREATE TABLE IF NOT EXISTS public.units (
    unit_id integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(50) NOT NULL,
    CONSTRAINT units_pkey PRIMARY KEY (unit_id),
    CONSTRAINT units_code_key UNIQUE (code)
);
CREATE SEQUENCE IF NOT EXISTS public.units_unit_id_seq AS integer START WITH 1 INCREMENT BY 1;
ALTER SEQUENCE public.units_unit_id_seq OWNED BY public.units.unit_id;
ALTER TABLE ONLY public.units
ALTER COLUMN unit_id
SET DEFAULT nextval('public.units_unit_id_seq'::regclass);
-- =======================
-- Create Storage Types table
-- =======================
CREATE TABLE IF NOT EXISTS public.storage_types (
    storage_type_id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    CONSTRAINT storage_types_pkey PRIMARY KEY (storage_type_id),
    CONSTRAINT storage_types_code_key UNIQUE (code)
);
CREATE SEQUENCE IF NOT EXISTS public.storage_types_storage_type_id_seq AS integer START WITH 1 INCREMENT BY 1;
ALTER SEQUENCE public.storage_types_storage_type_id_seq OWNED BY public.storage_types.storage_type_id;
ALTER TABLE ONLY public.storage_types
ALTER COLUMN storage_type_id
SET DEFAULT nextval(
        'public.storage_types_storage_type_id_seq'::regclass
    );
-- =======================
-- Users table (google_id removed)
-- =======================
CREATE TABLE IF NOT EXISTS public.users (
    user_id integer NOT NULL,
    name character varying(150) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text,
    role character varying(50),
    branch_id integer,
    created_at timestamp with time zone DEFAULT now(),
    last_login timestamp with time zone,
    CONSTRAINT users_pkey PRIMARY KEY (user_id),
    CONSTRAINT users_email_key UNIQUE (email)
);
CREATE SEQUENCE IF NOT EXISTS public.users_user_id_seq AS integer START WITH 1 INCREMENT BY 1;
ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;
ALTER TABLE ONLY public.users
ALTER COLUMN user_id
SET DEFAULT nextval('public.users_user_id_seq'::regclass);
-- =======================
-- Sessions table
-- =======================
CREATE TABLE IF NOT EXISTS public.sessions (
    session_id integer NOT NULL,
    user_id integer,
    jwt_token text NOT NULL,
    refresh_token text,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    user_agent text,
    ip_address text,
    CONSTRAINT sessions_pkey PRIMARY KEY (session_id)
);
CREATE SEQUENCE IF NOT EXISTS public.sessions_session_id_seq AS integer START WITH 1 INCREMENT BY 1;
ALTER SEQUENCE public.sessions_session_id_seq OWNED BY public.sessions.session_id;
ALTER TABLE ONLY public.sessions
ALTER COLUMN session_id
SET DEFAULT nextval('public.sessions_session_id_seq'::regclass);
-- =======================
-- Ingredients table (weight fields removed)
-- =======================
CREATE TABLE IF NOT EXISTS public.ingredients (
    ingredient_id integer NOT NULL,
    branch_id integer,
    name character varying(200) NOT NULL,
    quantity_in_stock numeric(12, 4) NOT NULL,
    unit_id integer,
    manufacture_date date,
    expiry_date date,
    storage_type_id integer,
    cost_per_unit numeric(10, 4),
    reorder_level numeric(12, 4),
    image_url text,
    added_at timestamp with time zone DEFAULT now(),
    last_updated timestamp with time zone DEFAULT now(),
    CONSTRAINT ingredients_pkey PRIMARY KEY (ingredient_id)
);
CREATE SEQUENCE IF NOT EXISTS public.ingredients_ingredient_id_seq AS integer START WITH 1 INCREMENT BY 1;
ALTER SEQUENCE public.ingredients_ingredient_id_seq OWNED BY public.ingredients.ingredient_id;
ALTER TABLE ONLY public.ingredients
ALTER COLUMN ingredient_id
SET DEFAULT nextval('public.ingredients_ingredient_id_seq'::regclass);
-- =======================
-- Recipes table
-- =======================
CREATE TABLE IF NOT EXISTS public.recipes (
    recipe_id integer NOT NULL,
    branch_id integer,
    name character varying(200) NOT NULL,
    image_url text,
    cooking_time_minutes integer,
    description text,
    base_price numeric(12, 4) NOT NULL,
    is_generated boolean DEFAULT false,
    created_by integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT recipes_pkey PRIMARY KEY (recipe_id)
);
CREATE SEQUENCE IF NOT EXISTS public.recipes_recipe_id_seq AS integer START WITH 1 INCREMENT BY 1;
ALTER SEQUENCE public.recipes_recipe_id_seq OWNED BY public.recipes.recipe_id;
ALTER TABLE ONLY public.recipes
ALTER COLUMN recipe_id
SET DEFAULT nextval('public.recipes_recipe_id_seq'::regclass);
-- =======================
-- Recipe Ingredients table
-- =======================
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    recipe_ingredient_id integer NOT NULL,
    recipe_id integer,
    ingredient_id integer,
    quantity_required numeric(12, 4) NOT NULL,
    unit_id integer,
    CONSTRAINT recipe_ingredients_pkey PRIMARY KEY (recipe_ingredient_id)
);
CREATE SEQUENCE IF NOT EXISTS public.recipe_ingredients_recipe_ingredient_id_seq AS integer START WITH 1 INCREMENT BY 1;
ALTER SEQUENCE public.recipe_ingredients_recipe_ingredient_id_seq OWNED BY public.recipe_ingredients.recipe_ingredient_id;
ALTER TABLE ONLY public.recipe_ingredients
ALTER COLUMN recipe_ingredient_id
SET DEFAULT nextval(
        'public.recipe_ingredients_recipe_ingredient_id_seq'::regclass
    );
-- =======================
-- UPDATED Seed Data (Extended Units)
-- =======================
INSERT INTO public.units (code, name)
VALUES ('g', 'Grams'),
    ('kg', 'Kilograms'),
    ('ml', 'Milliliters'),
    ('l', 'Liters'),
    ('tsp', 'Teaspoon'),
    ('tbsp', 'Tablespoon'),
    ('cup', 'Cup'),
    ('shot', 'Shot'),
    ('unit', 'Unit') ON CONFLICT (code) DO NOTHING;
-- Storage Types Seed
INSERT INTO public.storage_types (code, name)
VALUES ('FRIDGE', 'Refrigerator'),
    ('FREEZER', 'Freezer'),
    ('PANTRY', 'Pantry'),
    ('ROOM_TEMP', 'Room Temperature'),
    ('DRY_STORAGE', 'Dry Storage') ON CONFLICT (code) DO NOTHING;
-- Default Admin User Seed
-- Email: admin@kitchenpal.com
-- Password: admin123
INSERT INTO public.users (name, email, password_hash, role)
VALUES (
        'Admin',
        'admin@kitchenpal.com',
        '$2a$10$tYP/vVZSoZY/CdF48sljpOdVFvD0RzkbWacxr/HE9K5Hse3xb9PSi',
        'ADMIN'
    ) ON CONFLICT (email) DO
UPDATE
SET password_hash = EXCLUDED.password_hash;