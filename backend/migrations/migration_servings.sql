-- ============================================================
-- Migration: Add serving fields to recipes and generated_recipes
-- ============================================================

-- Add total_servings and serving_description to recipes
ALTER TABLE public.recipes
    ADD COLUMN IF NOT EXISTS total_servings INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS serving_description CHARACTER VARYING(200);

-- Add suggested_servings to generated_recipes
ALTER TABLE public.generated_recipes
    ADD COLUMN IF NOT EXISTS suggested_servings INTEGER NOT NULL DEFAULT 1;

-- Update constraint for total_servings > 0
ALTER TABLE public.recipes
    ADD CONSTRAINT recipes_total_servings_check CHECK (total_servings >= 1);
