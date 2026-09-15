-- Migration: Update exercises table schema for GymVisual Dataset
-- Supports 4-digit text IDs (e.g. "0001") and rich exercise media & metadata

-- 1. Drop existing FK constraints temporarily to alter column types safely
ALTER TABLE IF EXISTS snippet_exercises DROP CONSTRAINT IF EXISTS snippet_exercises_exercise_id_fkey;
ALTER TABLE IF EXISTS sets DROP CONSTRAINT IF EXISTS sets_exercise_id_fkey;

-- 2. Ensure exercise_id and id columns use text (not UUID) to allow 4-digit codes
ALTER TABLE IF EXISTS snippet_exercises ALTER COLUMN exercise_id TYPE text;
ALTER TABLE IF EXISTS sets ALTER COLUMN exercise_id TYPE text;
ALTER TABLE IF EXISTS exercises ALTER COLUMN id TYPE text;

-- 3. Add GymVisual dataset columns to exercises table
ALTER TABLE IF EXISTS exercises ADD COLUMN IF NOT EXISTS body_part text;
ALTER TABLE IF EXISTS exercises ADD COLUMN IF NOT EXISTS target_muscle text;
ALTER TABLE IF EXISTS exercises ADD COLUMN IF NOT EXISTS secondary_muscles text;
ALTER TABLE IF EXISTS exercises ADD COLUMN IF NOT EXISTS equipment text;
ALTER TABLE IF EXISTS exercises ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE IF EXISTS exercises ADD COLUMN IF NOT EXISTS gif_url text;
ALTER TABLE IF EXISTS exercises ADD COLUMN IF NOT EXISTS instructions text;
ALTER TABLE IF EXISTS exercises ADD COLUMN IF NOT EXISTS muscle_group text;

-- 4. Re-establish foreign key constraints
ALTER TABLE IF EXISTS snippet_exercises 
  ADD CONSTRAINT snippet_exercises_exercise_id_fkey 
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS sets 
  ADD CONSTRAINT sets_exercise_id_fkey 
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT;

-- 5. Public catalog RLS policies
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public exercises are viewable by everyone" ON exercises;
CREATE POLICY "Public exercises are viewable by everyone" ON exercises
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert custom exercises" ON exercises;
CREATE POLICY "Users can insert custom exercises" ON exercises
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update their own custom exercises" ON exercises;
CREATE POLICY "Users can update their own custom exercises" ON exercises
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own custom exercises" ON exercises;
CREATE POLICY "Users can delete their own custom exercises" ON exercises
  FOR DELETE USING (auth.uid() = user_id);
