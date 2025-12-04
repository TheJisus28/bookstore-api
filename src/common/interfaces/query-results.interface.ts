// RF-2: Body measurement history
export interface BodyMeasurementHistory {
  measurement_id: number;
  weight: number;
  height: number;
  measured_at: Date;
  days_ago: number;
}

// RF-3: Workout session by date
export interface WorkoutSessionByDate {
  session_id: number;
  date: Date;
  used_supplement: boolean;
  notes: string | null;
  total_exercises: number;
  total_sets: number;
}

// RF-4: Exercise search result
export interface ExerciseSearchResult {
  exercise_id: number;
  exercise_name: string;
  category_id: number;
  category_name: string;
  is_custom: boolean;
  is_own_custom: boolean;
}

// RF-6: Workout history
export interface WorkoutHistory {
  session_id: number;
  workout_date: Date;
  used_supplement: boolean;
  total_exercises: number;
  total_sets: number;
  total_reps: number;
  total_volume: number;
  total_time: number;
}

// RF-6: Workout session details
export interface WorkoutSessionDetail {
  workout_exercise_id: number;
  exercise_order: number;
  exercise_id: number;
  exercise_name: string;
  category_name: string;
  set_number: number | null;
  reps: number | null;
  weight: number | null;
  exercise_time: number | null;
  rest_time: number | null;
}

// RF-7: Exercise progress
export interface ExerciseProgress {
  workout_date: Date;
  used_supplement: boolean;
  set_number: number;
  reps: number;
  weight: number;
  volume: number;
  exercise_time: number;
  max_weight_in_session: number;
  avg_reps_in_session: number;
}

// RF-7: Supplement performance comparison
export interface SupplementPerformanceComparison {
  used_supplement: boolean;
  total_workouts: number;
  total_sets: number;
  avg_weight: number;
  max_weight: number;
  avg_reps: number;
  max_reps: number;
  total_volume: number;
}

// RF-8: Favorite exercises by day
export interface FavoriteExerciseResult {
  favorite_id: number;
  exercise_id: number;
  exercise_name: string;
  category_name: string;
  display_order: number;
}
