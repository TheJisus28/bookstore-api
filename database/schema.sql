-- =====================================================
-- Workout Tracker Database Schema
-- PostgreSQL 16+
-- =====================================================

-- Drop tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS favorite_exercises_by_day CASCADE;
DROP TABLE IF EXISTS exercise_sets CASCADE;
DROP TABLE IF EXISTS workout_exercises CASCADE;
DROP TABLE IF EXISTS workout_sessions CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS exercise_categories CASCADE;
DROP TABLE IF EXISTS user_body_measurements CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- CATALOG TABLES
-- =====================================================

CREATE TABLE exercise_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

-- Insert predefined categories
INSERT INTO exercise_categories (name) VALUES
  ('chest'),
  ('back'),
  ('legs'),
  ('shoulders'),
  ('arms'),
  ('abs'),
  ('cardio'),
  ('other');

-- =====================================================
-- TABLE: users
-- =====================================================

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 10 AND age <= 120),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- =====================================================
-- TABLE: user_body_measurements
-- =====================================================

CREATE TABLE user_body_measurements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight DECIMAL(5,2) CHECK (weight >= 20 AND weight <= 500),
  height DECIMAL(5,2) CHECK (height >= 50 AND height <= 300),
  measured_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_body_measurements_user_id ON user_body_measurements(user_id);
CREATE INDEX idx_body_measurements_measured_at ON user_body_measurements(measured_at DESC);

-- =====================================================
-- TABLE: exercises
-- =====================================================

CREATE TABLE exercises (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id INTEGER NOT NULL REFERENCES exercise_categories(id) ON DELETE RESTRICT,
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT check_custom_exercise CHECK (
    (is_custom = FALSE AND user_id IS NULL) OR
    (is_custom = TRUE AND user_id IS NOT NULL)
  )
);

CREATE INDEX idx_exercises_category_id ON exercises(category_id);
CREATE INDEX idx_exercises_user_id ON exercises(user_id);
CREATE INDEX idx_exercises_name ON exercises(name);

-- =====================================================
-- TABLE: workout_sessions
-- =====================================================

CREATE TABLE workout_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  used_supplement BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_date UNIQUE(user_id, date)
);

CREATE INDEX idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX idx_workout_sessions_date ON workout_sessions(date DESC);

-- =====================================================
-- TABLE: workout_exercises
-- =====================================================

CREATE TABLE workout_exercises (
  id SERIAL PRIMARY KEY,
  workout_session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL CHECK ("order" >= 1),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_session_exercise_order UNIQUE(workout_session_id, "order")
);

CREATE INDEX idx_workout_exercises_session_id ON workout_exercises(workout_session_id);
CREATE INDEX idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);

-- =====================================================
-- TABLE: exercise_sets
-- =====================================================

CREATE TABLE exercise_sets (
  id SERIAL PRIMARY KEY,
  workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL CHECK (set_number >= 1),
  reps INTEGER NOT NULL CHECK (reps >= 1),
  weight DECIMAL(6,2) NOT NULL CHECK (weight >= 0),
  exercise_time INTEGER NOT NULL CHECK (exercise_time >= 0), -- seconds
  rest_time INTEGER NOT NULL DEFAULT 0 CHECK (rest_time >= 0), -- seconds
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_workout_exercise_set UNIQUE(workout_exercise_id, set_number)
);

CREATE INDEX idx_exercise_sets_workout_exercise_id ON exercise_sets(workout_exercise_id);

-- =====================================================
-- TABLE: favorite_exercises_by_day
-- =====================================================

CREATE TABLE favorite_exercises_by_day (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL CHECK ("order" >= 1),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_day_order UNIQUE(user_id, day_of_week, "order")
);

CREATE INDEX idx_favorite_exercises_user_day ON favorite_exercises_by_day(user_id, day_of_week);

-- =====================================================
-- SEED DATA: Predefined Exercises
-- =====================================================

INSERT INTO exercises (name, category_id, is_custom, user_id) VALUES
  -- Chest (category_id = 1)
  ('Bench Press', 1, FALSE, NULL),
  ('Incline Bench Press', 1, FALSE, NULL),
  ('Decline Bench Press', 1, FALSE, NULL),
  ('Dumbbell Press', 1, FALSE, NULL),
  ('Push-ups', 1, FALSE, NULL),
  ('Cable Flyes', 1, FALSE, NULL),
  ('Dips', 1, FALSE, NULL),
  
  -- Back (category_id = 2)
  ('Deadlift', 2, FALSE, NULL),
  ('Pull-ups', 2, FALSE, NULL),
  ('Barbell Row', 2, FALSE, NULL),
  ('Lat Pulldown', 2, FALSE, NULL),
  ('Seated Cable Row', 2, FALSE, NULL),
  ('T-Bar Row', 2, FALSE, NULL),
  ('Face Pulls', 2, FALSE, NULL),
  
  -- Legs (category_id = 3)
  ('Squat', 3, FALSE, NULL),
  ('Leg Press', 3, FALSE, NULL),
  ('Romanian Deadlift', 3, FALSE, NULL),
  ('Leg Curl', 3, FALSE, NULL),
  ('Leg Extension', 3, FALSE, NULL),
  ('Lunges', 3, FALSE, NULL),
  ('Bulgarian Split Squat', 3, FALSE, NULL),
  ('Calf Raises', 3, FALSE, NULL),
  
  -- Shoulders (category_id = 4)
  ('Overhead Press', 4, FALSE, NULL),
  ('Lateral Raises', 4, FALSE, NULL),
  ('Front Raises', 4, FALSE, NULL),
  ('Rear Delt Flyes', 4, FALSE, NULL),
  ('Arnold Press', 4, FALSE, NULL),
  ('Upright Row', 4, FALSE, NULL),
  
  -- Arms (category_id = 5)
  ('Barbell Curl', 5, FALSE, NULL),
  ('Dumbbell Curl', 5, FALSE, NULL),
  ('Hammer Curl', 5, FALSE, NULL),
  ('Tricep Pushdown', 5, FALSE, NULL),
  ('Overhead Tricep Extension', 5, FALSE, NULL),
  ('Close-Grip Bench Press', 5, FALSE, NULL),
  ('Preacher Curl', 5, FALSE, NULL),
  
  -- Abs (category_id = 6)
  ('Crunches', 6, FALSE, NULL),
  ('Planks', 6, FALSE, NULL),
  ('Russian Twists', 6, FALSE, NULL),
  ('Leg Raises', 6, FALSE, NULL),
  ('Cable Crunches', 6, FALSE, NULL),
  ('Ab Wheel Rollout', 6, FALSE, NULL),
  
  -- Cardio (category_id = 7)
  ('Running', 7, FALSE, NULL),
  ('Cycling', 7, FALSE, NULL),
  ('Rowing', 7, FALSE, NULL),
  ('Jump Rope', 7, FALSE, NULL),
  ('Stair Climber', 7, FALSE, NULL);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_workout_sessions_updated_at
  BEFORE UPDATE ON workout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RF-1: GESTIÓN DE PERFIL DEL USUARIO
-- =====================================================

-- Procedure: Register user with initial measurements (TRANSACTION)
CREATE OR REPLACE PROCEDURE sp_register_user(
  p_name VARCHAR,
  p_email VARCHAR,
  p_password VARCHAR,
  p_age INTEGER,
  p_initial_weight DECIMAL,
  p_initial_height DECIMAL,
  OUT p_user_id INTEGER
) AS $$
BEGIN
  -- Insert user
  INSERT INTO users (name, email, password, age)
  VALUES (p_name, p_email, p_password, p_age)
  RETURNING id INTO p_user_id;
  
  -- Insert initial body measurement
  INSERT INTO user_body_measurements (user_id, weight, height, measured_at)
  VALUES (p_user_id, p_initial_weight, p_initial_height, NOW());
  
  RAISE NOTICE 'User registered with ID: %', p_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RF-2: ACTUALIZACIÓN DEL PESO Y ALTURA
-- =====================================================

-- Function: Get body measurement history for a user
CREATE OR REPLACE FUNCTION fn_get_body_measurement_history(
  p_user_id INTEGER,
  p_limit INTEGER DEFAULT NULL
) RETURNS TABLE (
  measurement_id INTEGER,
  weight DECIMAL,
  height DECIMAL,
  measured_at TIMESTAMP,
  days_ago INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ubm.id AS measurement_id,
    ubm.weight,
    ubm.height,
    ubm.measured_at,
    (CURRENT_DATE - ubm.measured_at::DATE)::INTEGER AS days_ago
  FROM user_body_measurements ubm
  WHERE ubm.user_id = p_user_id
  ORDER BY ubm.measured_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RF-3: SELECCIÓN DE DÍA PARA REGISTRAR EJERCICIOS
-- =====================================================

-- Function: Get or verify if workout session exists for a date
CREATE OR REPLACE FUNCTION fn_get_workout_session_by_date(
  p_user_id INTEGER,
  p_date DATE
) RETURNS TABLE (
  session_id INTEGER,
  date DATE,
  used_supplement BOOLEAN,
  notes TEXT,
  total_exercises BIGINT,
  total_sets BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ws.id AS session_id,
    ws.date,
    ws.used_supplement,
    ws.notes,
    COUNT(DISTINCT we.id) AS total_exercises,
    COUNT(es.id) AS total_sets
  FROM workout_sessions ws
  LEFT JOIN workout_exercises we ON ws.id = we.workout_session_id
  LEFT JOIN exercise_sets es ON we.id = es.workout_exercise_id
  WHERE ws.user_id = p_user_id AND ws.date = p_date
  GROUP BY ws.id, ws.date, ws.used_supplement, ws.notes;
END;
$$ LANGUAGE plpgsql;

-- Procedure: Get or create workout session for a date
CREATE OR REPLACE PROCEDURE sp_get_or_create_workout_session(
  p_user_id INTEGER,
  p_date DATE,
  p_used_supplement BOOLEAN DEFAULT FALSE,
  OUT p_session_id INTEGER,
  OUT p_is_new BOOLEAN
) AS $$
BEGIN
  -- Try to get existing session
  SELECT id INTO p_session_id
  FROM workout_sessions
  WHERE user_id = p_user_id AND date = p_date;
  
  IF p_session_id IS NULL THEN
    -- Create new session
    INSERT INTO workout_sessions (user_id, date, used_supplement)
    VALUES (p_user_id, p_date, p_used_supplement)
    RETURNING id INTO p_session_id;
    p_is_new := TRUE;
  ELSE
    p_is_new := FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RF-4: BANCO DE EJERCICIOS
-- =====================================================

-- Function: Search exercises in the bank
CREATE OR REPLACE FUNCTION fn_search_exercises(
  p_search_term VARCHAR DEFAULT NULL,
  p_category_id INTEGER DEFAULT NULL,
  p_user_id INTEGER DEFAULT NULL,
  p_include_custom BOOLEAN DEFAULT TRUE
) RETURNS TABLE (
  exercise_id INTEGER,
  exercise_name VARCHAR,
  category_id INTEGER,
  category_name VARCHAR,
  is_custom BOOLEAN,
  is_own_custom BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id AS exercise_id,
    e.name AS exercise_name,
    e.category_id,
    ec.name AS category_name,
    e.is_custom,
    (e.user_id = p_user_id) AS is_own_custom
  FROM exercises e
  JOIN exercise_categories ec ON e.category_id = ec.id
  WHERE 
    (p_search_term IS NULL OR e.name ILIKE '%' || p_search_term || '%')
    AND (p_category_id IS NULL OR e.category_id = p_category_id)
    AND (
      e.is_custom = FALSE 
      OR (p_include_custom AND e.user_id = p_user_id)
    )
  ORDER BY e.is_custom ASC, e.name ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RF-5: REGISTRO DE SERIES Y REPETICIONES
-- =====================================================

-- Procedure: Add exercise to workout session
CREATE OR REPLACE PROCEDURE sp_add_exercise_to_session(
  p_workout_session_id INTEGER,
  p_exercise_id INTEGER,
  OUT p_workout_exercise_id INTEGER
) AS $$
DECLARE
  v_next_order INTEGER;
BEGIN
  -- Get next order number
  SELECT COALESCE(MAX("order"), 0) + 1 INTO v_next_order
  FROM workout_exercises
  WHERE workout_session_id = p_workout_session_id;
  
  -- Insert workout exercise
  INSERT INTO workout_exercises (workout_session_id, exercise_id, "order")
  VALUES (p_workout_session_id, p_exercise_id, v_next_order)
  RETURNING id INTO p_workout_exercise_id;
END;
$$ LANGUAGE plpgsql;

-- Procedure: Record exercise set with all details
CREATE OR REPLACE PROCEDURE sp_record_exercise_set(
  p_workout_exercise_id INTEGER,
  p_reps INTEGER,
  p_weight DECIMAL,
  p_exercise_time INTEGER,
  p_rest_time INTEGER DEFAULT 0,
  OUT p_set_id INTEGER
) AS $$
DECLARE
  v_next_set_number INTEGER;
BEGIN
  -- Get next set number
  SELECT COALESCE(MAX(set_number), 0) + 1 INTO v_next_set_number
  FROM exercise_sets
  WHERE workout_exercise_id = p_workout_exercise_id;
  
  -- Insert set
  INSERT INTO exercise_sets (
    workout_exercise_id, 
    set_number, 
    reps, 
    weight, 
    exercise_time, 
    rest_time
  )
  VALUES (
    p_workout_exercise_id, 
    v_next_set_number, 
    p_reps, 
    p_weight, 
    p_exercise_time, 
    p_rest_time
  )
  RETURNING id INTO p_set_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RF-6: VISUALIZACIÓN DEL HISTORIAL DE EJERCICIOS
-- =====================================================

-- Function: Get workout history for a user
CREATE OR REPLACE FUNCTION fn_get_workout_history(
  p_user_id INTEGER,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 30
) RETURNS TABLE (
  session_id INTEGER,
  workout_date DATE,
  used_supplement BOOLEAN,
  total_exercises BIGINT,
  total_sets BIGINT,
  total_reps BIGINT,
  total_volume DECIMAL,
  total_time INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ws.id AS session_id,
    ws.date AS workout_date,
    ws.used_supplement,
    COUNT(DISTINCT we.id) AS total_exercises,
    COUNT(es.id) AS total_sets,
    SUM(es.reps) AS total_reps,
    ROUND(SUM(es.weight * es.reps), 2) AS total_volume,
    SUM(es.exercise_time + es.rest_time) AS total_time
  FROM workout_sessions ws
  LEFT JOIN workout_exercises we ON ws.id = we.workout_session_id
  LEFT JOIN exercise_sets es ON we.id = es.workout_exercise_id
  WHERE 
    ws.user_id = p_user_id
    AND (p_start_date IS NULL OR ws.date >= p_start_date)
    AND (p_end_date IS NULL OR ws.date <= p_end_date)
  GROUP BY ws.id, ws.date, ws.used_supplement
  ORDER BY ws.date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get detailed workout session with all exercises and sets
CREATE OR REPLACE FUNCTION fn_get_workout_session_details(
  p_session_id INTEGER
) RETURNS TABLE (
  workout_exercise_id INTEGER,
  exercise_order INTEGER,
  exercise_id INTEGER,
  exercise_name VARCHAR,
  category_name VARCHAR,
  set_number INTEGER,
  reps INTEGER,
  weight DECIMAL,
  exercise_time INTEGER,
  rest_time INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    we.id AS workout_exercise_id,
    we."order" AS exercise_order,
    e.id AS exercise_id,
    e.name AS exercise_name,
    ec.name AS category_name,
    es.set_number,
    es.reps,
    es.weight,
    es.exercise_time,
    es.rest_time
  FROM workout_exercises we
  JOIN exercises e ON we.exercise_id = e.id
  JOIN exercise_categories ec ON e.category_id = ec.id
  LEFT JOIN exercise_sets es ON we.id = es.workout_exercise_id
  WHERE we.workout_session_id = p_session_id
  ORDER BY we."order", es.set_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RF-7: HISTORIAL DE PROGRESO POR EJERCICIO
-- =====================================================

-- Function: Get exercise progress over time
CREATE OR REPLACE FUNCTION fn_get_exercise_progress(
  p_user_id INTEGER,
  p_exercise_id INTEGER,
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  workout_date DATE,
  used_supplement BOOLEAN,
  set_number INTEGER,
  reps INTEGER,
  weight DECIMAL,
  volume DECIMAL,
  exercise_time INTEGER,
  max_weight_in_session DECIMAL,
  avg_reps_in_session DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ws.date AS workout_date,
    ws.used_supplement,
    es.set_number,
    es.reps,
    es.weight,
    ROUND(es.weight * es.reps, 2) AS volume,
    es.exercise_time,
    MAX(es.weight) OVER (PARTITION BY ws.id) AS max_weight_in_session,
    ROUND(AVG(es.reps) OVER (PARTITION BY ws.id), 2) AS avg_reps_in_session
  FROM workout_sessions ws
  JOIN workout_exercises we ON ws.id = we.workout_session_id
  JOIN exercise_sets es ON we.id = es.workout_exercise_id
  WHERE 
    ws.user_id = p_user_id
    AND we.exercise_id = p_exercise_id
  ORDER BY ws.date DESC, es.set_number
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Compare performance with and without supplements (RF-7)
CREATE OR REPLACE FUNCTION fn_compare_supplement_performance(
  p_user_id INTEGER,
  p_exercise_id INTEGER
) RETURNS TABLE (
  used_supplement BOOLEAN,
  total_workouts BIGINT,
  total_sets BIGINT,
  avg_weight DECIMAL,
  max_weight DECIMAL,
  avg_reps DECIMAL,
  max_reps INTEGER,
  total_volume DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ws.used_supplement,
    COUNT(DISTINCT ws.id) AS total_workouts,
    COUNT(es.id) AS total_sets,
    ROUND(AVG(es.weight), 2) AS avg_weight,
    MAX(es.weight) AS max_weight,
    ROUND(AVG(es.reps), 2) AS avg_reps,
    MAX(es.reps) AS max_reps,
    ROUND(SUM(es.weight * es.reps), 2) AS total_volume
  FROM workout_sessions ws
  JOIN workout_exercises we ON ws.id = we.workout_session_id
  JOIN exercise_sets es ON we.id = es.workout_exercise_id
  WHERE 
    ws.user_id = p_user_id
    AND we.exercise_id = p_exercise_id
  GROUP BY ws.used_supplement
  ORDER BY ws.used_supplement DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RF-8: EJERCICIOS FRECUENTES POR DÍA ("EN CALIENTE")
-- =====================================================

-- Function: Get favorite exercises for a specific day of week
CREATE OR REPLACE FUNCTION fn_get_favorite_exercises_by_day(
  p_user_id INTEGER,
  p_day_of_week INTEGER
) RETURNS TABLE (
  favorite_id INTEGER,
  exercise_id INTEGER,
  exercise_name VARCHAR,
  category_name VARCHAR,
  display_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fed.id AS favorite_id,
    e.id AS exercise_id,
    e.name AS exercise_name,
    ec.name AS category_name,
    fed."order" AS display_order
  FROM favorite_exercises_by_day fed
  JOIN exercises e ON fed.exercise_id = e.id
  JOIN exercise_categories ec ON e.category_id = ec.id
  WHERE 
    fed.user_id = p_user_id
    AND fed.day_of_week = p_day_of_week
  ORDER BY fed."order";
END;
$$ LANGUAGE plpgsql;

-- Procedure: Set favorite exercise for a day (replaces or adds)
CREATE OR REPLACE PROCEDURE sp_set_favorite_exercise_for_day(
  p_user_id INTEGER,
  p_day_of_week INTEGER,
  p_exercise_id INTEGER,
  p_order INTEGER,
  OUT p_favorite_id INTEGER
) AS $$
BEGIN
  -- Delete if exists at same order
  DELETE FROM favorite_exercises_by_day
  WHERE user_id = p_user_id 
    AND day_of_week = p_day_of_week 
    AND "order" = p_order;
  
  -- Insert new favorite
  INSERT INTO favorite_exercises_by_day (user_id, day_of_week, exercise_id, "order")
  VALUES (p_user_id, p_day_of_week, p_exercise_id, p_order)
  RETURNING id INTO p_favorite_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS (Para consultas frecuentes)
-- =====================================================

-- View: Workout summary by user (RF-6)
CREATE OR REPLACE VIEW v_user_workout_summary AS
SELECT 
  u.id AS user_id,
  u.name AS user_name,
  COUNT(DISTINCT ws.id) AS total_workouts,
  COUNT(DISTINCT we.exercise_id) AS unique_exercises_performed,
  MAX(ws.date) AS last_workout_date,
  SUM(es.reps) AS lifetime_total_reps,
  ROUND(SUM(es.weight * es.reps), 2) AS lifetime_total_volume
FROM users u
LEFT JOIN workout_sessions ws ON u.id = ws.user_id
LEFT JOIN workout_exercises we ON ws.id = we.workout_session_id
LEFT JOIN exercise_sets es ON we.id = es.workout_exercise_id
GROUP BY u.id, u.name;

-- View: Exercise usage statistics (RF-4, RF-6)
CREATE OR REPLACE VIEW v_exercise_usage_stats AS
SELECT 
  e.id AS exercise_id,
  e.name AS exercise_name,
  ec.name AS category_name,
  e.is_custom,
  COUNT(DISTINCT we.workout_session_id) AS times_used,
  COUNT(DISTINCT we.id) AS total_workout_exercises,
  COUNT(es.id) AS total_sets_performed
FROM exercises e
JOIN exercise_categories ec ON e.category_id = ec.id
LEFT JOIN workout_exercises we ON e.id = we.exercise_id
LEFT JOIN exercise_sets es ON we.id = es.workout_exercise_id
GROUP BY e.id, e.name, ec.name, e.is_custom;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ===============================================';
  RAISE NOTICE '✅ Database schema created successfully!';
  RAISE NOTICE '✅ ===============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Tables created: 8';
  RAISE NOTICE '   - exercise_categories (catalog)';
  RAISE NOTICE '   - users';
  RAISE NOTICE '   - user_body_measurements';
  RAISE NOTICE '   - exercises';
  RAISE NOTICE '   - workout_sessions';
  RAISE NOTICE '   - workout_exercises';
  RAISE NOTICE '   - exercise_sets';
  RAISE NOTICE '   - favorite_exercises_by_day';
  RAISE NOTICE '';
  RAISE NOTICE '🏷️  Exercise categories: %', (SELECT COUNT(*) FROM exercise_categories);
  RAISE NOTICE '🏋️  Predefined exercises: %', (SELECT COUNT(*) FROM exercises WHERE is_custom = FALSE);
  RAISE NOTICE '';
  RAISE NOTICE '⚙️  Triggers: 2 (auto-update timestamps)';
  RAISE NOTICE '💾 Stored Procedures: 5';
  RAISE NOTICE '   - sp_register_user (RF-1)';
  RAISE NOTICE '   - sp_get_or_create_workout_session (RF-3)';
  RAISE NOTICE '   - sp_add_exercise_to_session (RF-5)';
  RAISE NOTICE '   - sp_record_exercise_set (RF-5)';
  RAISE NOTICE '   - sp_set_favorite_exercise_for_day (RF-8)';
  RAISE NOTICE '';
  RAISE NOTICE '📐 Functions: 8';
  RAISE NOTICE '   - fn_get_body_measurement_history (RF-2)';
  RAISE NOTICE '   - fn_get_workout_session_by_date (RF-3)';
  RAISE NOTICE '   - fn_search_exercises (RF-4)';
  RAISE NOTICE '   - fn_get_workout_history (RF-6)';
  RAISE NOTICE '   - fn_get_workout_session_details (RF-6)';
  RAISE NOTICE '   - fn_get_exercise_progress (RF-7)';
  RAISE NOTICE '   - fn_compare_supplement_performance (RF-7)';
  RAISE NOTICE '   - fn_get_favorite_exercises_by_day (RF-8)';
  RAISE NOTICE '';
  RAISE NOTICE '👁️  Views: 2';
  RAISE NOTICE '   - v_user_workout_summary';
  RAISE NOTICE '   - v_exercise_usage_stats';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 All requirements implemented!';
END $$;

