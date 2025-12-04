-- =====================================================
-- Reset Database - DROP ALL TABLES
-- =====================================================

DROP TABLE IF EXISTS favorite_exercises_by_day CASCADE;
DROP TABLE IF EXISTS exercise_sets CASCADE;
DROP TABLE IF EXISTS workout_exercises CASCADE;
DROP TABLE IF EXISTS workout_sessions CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS exercise_categories CASCADE;
DROP TABLE IF EXISTS user_body_measurements CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DO $$
BEGIN
  RAISE NOTICE '🗑️  All tables dropped successfully!';
END $$;

