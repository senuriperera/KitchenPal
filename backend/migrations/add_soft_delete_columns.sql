-- ============================================================
-- Migration: Add soft delete columns for ingredients and batches
-- ============================================================
-- Add deleted_at column to stock_ingredients
ALTER TABLE public.stock_ingredients
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
-- Add deleted_at column to ingredient_batches
ALTER TABLE public.ingredient_batches
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;
-- Create indexes for soft delete queries (commonly used in WHERE clauses)
CREATE INDEX IF NOT EXISTS stock_ingredients_deleted_at_idx ON public.stock_ingredients(deleted_at);
CREATE INDEX IF NOT EXISTS ingredient_batches_deleted_at_idx ON public.ingredient_batches(deleted_at);