-- KitchenPal Database Schema
-- Complete database structure for the KitchenPal application
-- Create Branches table
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
CREATE SEQUENCE IF NOT EXISTS public.branches_branch_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.branches_branch_id_seq OWNED BY public.branches.branch_id;
ALTER TABLE ONLY public.branches
ALTER COLUMN branch_id
SET DEFAULT nextval('public.branches_branch_id_seq'::regclass);
-- Create Units table
CREATE TABLE IF NOT EXISTS public.units (
    unit_id integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(50) NOT NULL,
    CONSTRAINT units_pkey PRIMARY KEY (unit_id),
    CONSTRAINT units_code_key UNIQUE (code)
);
CREATE SEQUENCE IF NOT EXISTS public.units_unit_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.units_unit_id_seq OWNED BY public.units.unit_id;
ALTER TABLE ONLY public.units
ALTER COLUMN unit_id
SET DEFAULT nextval('public.units_unit_id_seq'::regclass);
-- Create Storage Types table
CREATE TABLE IF NOT EXISTS public.storage_types (
    storage_type_id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    CONSTRAINT storage_types_pkey PRIMARY KEY (storage_type_id),
    CONSTRAINT storage_types_code_key UNIQUE (code)
);
CREATE SEQUENCE IF NOT EXISTS public.storage_types_storage_type_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.storage_types_storage_type_id_seq OWNED BY public.storage_types.storage_type_id;
ALTER TABLE ONLY public.storage_types
ALTER COLUMN storage_type_id
SET DEFAULT nextval(
        'public.storage_types_storage_type_id_seq'::regclass
    );
-- Update Branches table (if needed)
ALTER TABLE public.branches
ALTER COLUMN created_at
SET DEFAULT now();
-- Create Users table
CREATE TABLE IF NOT EXISTS public.users (
    user_id integer NOT NULL,
    name character varying(150) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text,
    google_id text,
    role character varying(50),
    branch_id integer,
    created_at timestamp with time zone DEFAULT now(),
    last_login timestamp with time zone,
    CONSTRAINT users_pkey PRIMARY KEY (user_id),
    CONSTRAINT users_email_key UNIQUE (email)
);
CREATE SEQUENCE IF NOT EXISTS public.users_user_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;
ALTER TABLE ONLY public.users
ALTER COLUMN user_id
SET DEFAULT nextval('public.users_user_id_seq'::regclass);
-- Create Sessions table
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
CREATE SEQUENCE IF NOT EXISTS public.sessions_session_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.sessions_session_id_seq OWNED BY public.sessions.session_id;
ALTER TABLE ONLY public.sessions
ALTER COLUMN session_id
SET DEFAULT nextval('public.sessions_session_id_seq'::regclass);
-- Create Ingredients table
CREATE TABLE IF NOT EXISTS public.ingredients (
    ingredient_id integer NOT NULL,
    branch_id integer,
    name character varying(200) NOT NULL,
    quantity_in_stock numeric(12, 4) NOT NULL,
    unit_id integer,
    expiry_date date,
    storage_type_id integer,
    cost_per_unit numeric(10, 4),
    reorder_level numeric(12, 4),
    added_at timestamp with time zone DEFAULT now(),
    last_updated timestamp with time zone DEFAULT now(),
    CONSTRAINT ingredients_pkey PRIMARY KEY (ingredient_id)
);
CREATE SEQUENCE IF NOT EXISTS public.ingredients_ingredient_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.ingredients_ingredient_id_seq OWNED BY public.ingredients.ingredient_id;
ALTER TABLE ONLY public.ingredients
ALTER COLUMN ingredient_id
SET DEFAULT nextval('public.ingredients_ingredient_id_seq'::regclass);
-- Create Recipes table
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
CREATE SEQUENCE IF NOT EXISTS public.recipes_recipe_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.recipes_recipe_id_seq OWNED BY public.recipes.recipe_id;
ALTER TABLE ONLY public.recipes
ALTER COLUMN recipe_id
SET DEFAULT nextval('public.recipes_recipe_id_seq'::regclass);
-- Create Recipe Ingredients table
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    recipe_ingredient_id integer NOT NULL,
    recipe_id integer,
    ingredient_id integer,
    quantity_required numeric(12, 4) NOT NULL,
    unit_id integer,
    CONSTRAINT recipe_ingredients_pkey PRIMARY KEY (recipe_ingredient_id)
);
CREATE SEQUENCE IF NOT EXISTS public.recipe_ingredients_recipe_ingredient_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.recipe_ingredients_recipe_ingredient_id_seq OWNED BY public.recipe_ingredients.recipe_ingredient_id;
ALTER TABLE ONLY public.recipe_ingredients
ALTER COLUMN recipe_ingredient_id
SET DEFAULT nextval(
        'public.recipe_ingredients_recipe_ingredient_id_seq'::regclass
    );
-- Create Recipe Steps table
CREATE TABLE IF NOT EXISTS public.recipe_steps (
    step_id integer NOT NULL,
    recipe_id integer,
    step_number integer NOT NULL,
    instruction text NOT NULL,
    CONSTRAINT recipe_steps_pkey PRIMARY KEY (step_id)
);
CREATE SEQUENCE IF NOT EXISTS public.recipe_steps_step_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.recipe_steps_step_id_seq OWNED BY public.recipe_steps.step_id;
ALTER TABLE ONLY public.recipe_steps
ALTER COLUMN step_id
SET DEFAULT nextval('public.recipe_steps_step_id_seq'::regclass);
-- Create Recipe Images table
CREATE TABLE IF NOT EXISTS public.recipe_images (
    recipe_image_id integer NOT NULL,
    recipe_id integer,
    image_url text NOT NULL,
    caption text,
    CONSTRAINT recipe_images_pkey PRIMARY KEY (recipe_image_id)
);
CREATE SEQUENCE IF NOT EXISTS public.recipe_images_recipe_image_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.recipe_images_recipe_image_id_seq OWNED BY public.recipe_images.recipe_image_id;
ALTER TABLE ONLY public.recipe_images
ALTER COLUMN recipe_image_id
SET DEFAULT nextval(
        'public.recipe_images_recipe_image_id_seq'::regclass
    );
-- Create Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    notification_id integer NOT NULL,
    branch_id integer,
    ingredient_id integer,
    type character varying(50) NOT NULL,
    message text NOT NULL,
    expiry_date date,
    generate_recipe_requested boolean DEFAULT false,
    is_resolved boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    CONSTRAINT notifications_pkey PRIMARY KEY (notification_id)
);
CREATE SEQUENCE IF NOT EXISTS public.notifications_notification_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.notifications_notification_id_seq OWNED BY public.notifications.notification_id;
ALTER TABLE ONLY public.notifications
ALTER COLUMN notification_id
SET DEFAULT nextval(
        'public.notifications_notification_id_seq'::regclass
    );
-- Create Recipe Suggestions table
CREATE TABLE IF NOT EXISTS public.recipe_suggestions (
    suggestion_id integer NOT NULL,
    branch_id integer,
    notification_id integer,
    recipe_id integer,
    expiring_ingredients json,
    suggested_discount_percentage numeric(5, 2),
    calculated_discounted_price numeric(10, 2),
    urgency_level character varying(20),
    status character varying(20) DEFAULT 'pending'::character varying,
    suggested_at timestamp with time zone DEFAULT now(),
    approved_by_user_id integer,
    approved_at timestamp with time zone,
    rejection_reason text,
    CONSTRAINT recipe_suggestions_pkey PRIMARY KEY (suggestion_id)
);
CREATE SEQUENCE IF NOT EXISTS public.recipe_suggestions_suggestion_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.recipe_suggestions_suggestion_id_seq OWNED BY public.recipe_suggestions.suggestion_id;
ALTER TABLE ONLY public.recipe_suggestions
ALTER COLUMN suggestion_id
SET DEFAULT nextval(
        'public.recipe_suggestions_suggestion_id_seq'::regclass
    );
-- Create Discounts table
CREATE TABLE IF NOT EXISTS public.discounts (
    discount_id integer NOT NULL,
    suggestion_id integer,
    branch_id integer,
    original_price numeric(10, 2) NOT NULL,
    suggested_discount_percentage numeric(5, 2) NOT NULL,
    admin_approved_discount_percentage numeric(5, 2),
    final_discounted_price numeric(10, 2) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    approved_by_admin_id integer,
    created_at timestamp with time zone DEFAULT now(),
    approved_at timestamp with time zone,
    admin_notes text,
    CONSTRAINT discounts_pkey PRIMARY KEY (discount_id)
);
CREATE SEQUENCE IF NOT EXISTS public.discounts_discount_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.discounts_discount_id_seq OWNED BY public.discounts.discount_id;
ALTER TABLE ONLY public.discounts
ALTER COLUMN discount_id
SET DEFAULT nextval('public.discounts_discount_id_seq'::regclass);
-- Create Sales table
CREATE TABLE IF NOT EXISTS public.sales (
    sale_id integer NOT NULL,
    branch_id integer,
    recipe_id integer,
    suggestion_id integer,
    discount_id integer,
    quantity_sold integer NOT NULL,
    base_price_per_unit numeric(10, 2) NOT NULL,
    final_price_per_unit numeric(10, 2) NOT NULL,
    total_revenue numeric(12, 2) NOT NULL,
    recipe_type character varying(20) DEFAULT 'standard'::character varying,
    sold_by_user_id integer,
    sale_date timestamp with time zone DEFAULT now(),
    inventory_deducted boolean DEFAULT false,
    notes text,
    CONSTRAINT sales_pkey PRIMARY KEY (sale_id)
);
CREATE SEQUENCE IF NOT EXISTS public.sales_sale_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.sales_sale_id_seq OWNED BY public.sales.sale_id;
ALTER TABLE ONLY public.sales
ALTER COLUMN sale_id
SET DEFAULT nextval('public.sales_sale_id_seq'::regclass);
-- Add Foreign Key Constraints
ALTER TABLE ONLY public.users
ADD CONSTRAINT users_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE SET NULL;
ALTER TABLE ONLY public.ingredients
ADD CONSTRAINT ingredients_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.sessions
ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.ingredients
ADD CONSTRAINT ingredients_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(unit_id);
ALTER TABLE ONLY public.ingredients
ADD CONSTRAINT ingredients_storage_type_id_fkey FOREIGN KEY (storage_type_id) REFERENCES public.storage_types(storage_type_id);
ALTER TABLE ONLY public.recipes
ADD CONSTRAINT recipes_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.recipes
ADD CONSTRAINT recipes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);
ALTER TABLE ONLY public.recipe_ingredients
ADD CONSTRAINT recipe_ingredients_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(recipe_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.recipe_ingredients
ADD CONSTRAINT recipe_ingredients_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(ingredient_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.recipe_ingredients
ADD CONSTRAINT recipe_ingredients_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.units(unit_id);
ALTER TABLE ONLY public.recipe_steps
ADD CONSTRAINT recipe_steps_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(recipe_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.recipe_images
ADD CONSTRAINT recipe_images_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(recipe_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.notifications
ADD CONSTRAINT notifications_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.notifications
ADD CONSTRAINT notifications_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(ingredient_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.recipe_suggestions
ADD CONSTRAINT recipe_suggestions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.recipe_suggestions
ADD CONSTRAINT recipe_suggestions_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(notification_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.recipe_suggestions
ADD CONSTRAINT recipe_suggestions_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(recipe_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.recipe_suggestions
ADD CONSTRAINT recipe_suggestions_approved_by_user_id_fkey FOREIGN KEY (approved_by_user_id) REFERENCES public.users(user_id);
ALTER TABLE ONLY public.discounts
ADD CONSTRAINT discounts_suggestion_id_fkey FOREIGN KEY (suggestion_id) REFERENCES public.recipe_suggestions(suggestion_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.discounts
ADD CONSTRAINT discounts_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.discounts
ADD CONSTRAINT discounts_approved_by_admin_id_fkey FOREIGN KEY (approved_by_admin_id) REFERENCES public.users(user_id);
ALTER TABLE ONLY public.sales
ADD CONSTRAINT sales_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(branch_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.sales
ADD CONSTRAINT sales_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(recipe_id);
ALTER TABLE ONLY public.sales
ADD CONSTRAINT sales_suggestion_id_fkey FOREIGN KEY (suggestion_id) REFERENCES public.recipe_suggestions(suggestion_id);
ALTER TABLE ONLY public.sales
ADD CONSTRAINT sales_discount_id_fkey FOREIGN KEY (discount_id) REFERENCES public.discounts(discount_id);
ALTER TABLE ONLY public.sales
ADD CONSTRAINT sales_sold_by_user_id_fkey FOREIGN KEY (sold_by_user_id) REFERENCES public.users(user_id);
-- Insert some basic data
INSERT INTO public.units (code, name)
VALUES ('kg', 'Kilograms'),
    ('g', 'Grams'),
    ('l', 'Liters'),
    ('ml', 'Milliliters'),
    ('pcs', 'Pieces'),
    ('cups', 'Cups'),
    ('tsp', 'Teaspoons'),
    ('tbsp', 'Tablespoons') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.storage_types (code, name)
VALUES ('FRIDGE', 'Refrigerator'),
    ('FREEZER', 'Freezer'),
    ('PANTRY', 'Pantry'),
    ('ROOM_TEMP', 'Room Temperature'),
    ('DRY_STORAGE', 'Dry Storage') ON CONFLICT (code) DO NOTHING;
-- Insert sample branch data
INSERT INTO public.branches (name, location, contact_email, contact_phone)
VALUES (
        'Main Branch',
        'Downtown Location, City Center',
        'main@kitchenpal.com',
        '+1-555-0100'
    ),
    (
        'North Branch',
        'North District, Shopping Mall',
        'north@kitchenpal.com',
        '+1-555-0101'
    ),
    (
        'South Branch',
        'South Avenue, Food Court',
        'south@kitchenpal.com',
        '+1-555-0102'
    ) ON CONFLICT DO NOTHING;
-- Set ownership to postgres
ALTER TABLE public.branches OWNER TO postgres;
ALTER TABLE public.units OWNER TO postgres;
ALTER TABLE public.storage_types OWNER TO postgres;
ALTER TABLE public.users OWNER TO postgres;
ALTER TABLE public.sessions OWNER TO postgres;
ALTER TABLE public.ingredients OWNER TO postgres;
ALTER TABLE public.recipes OWNER TO postgres;
ALTER TABLE public.recipe_ingredients OWNER TO postgres;
ALTER TABLE public.recipe_steps OWNER TO postgres;
ALTER TABLE public.recipe_images OWNER TO postgres;
ALTER TABLE public.notifications OWNER TO postgres;
ALTER TABLE public.recipe_suggestions OWNER TO postgres;
ALTER TABLE public.discounts OWNER TO postgres;
ALTER TABLE public.sales OWNER TO postgres;
ALTER SEQUENCE public.branches_branch_id_seq OWNER TO postgres;
ALTER SEQUENCE public.units_unit_id_seq OWNER TO postgres;
ALTER SEQUENCE public.storage_types_storage_type_id_seq OWNER TO postgres;
ALTER SEQUENCE public.users_user_id_seq OWNER TO postgres;
ALTER SEQUENCE public.sessions_session_id_seq OWNER TO postgres;
ALTER SEQUENCE public.ingredients_ingredient_id_seq OWNER TO postgres;
ALTER SEQUENCE public.recipes_recipe_id_seq OWNER TO postgres;
ALTER SEQUENCE public.recipe_ingredients_recipe_ingredient_id_seq OWNER TO postgres;
ALTER SEQUENCE public.recipe_steps_step_id_seq OWNER TO postgres;
ALTER SEQUENCE public.recipe_images_recipe_image_id_seq OWNER TO postgres;
ALTER SEQUENCE public.notifications_notification_id_seq OWNER TO postgres;
ALTER SEQUENCE public.recipe_suggestions_suggestion_id_seq OWNER TO postgres;
ALTER SEQUENCE public.discounts_discount_id_seq OWNER TO postgres;
ALTER SEQUENCE public.sales_sale_id_seq OWNER TO postgres;