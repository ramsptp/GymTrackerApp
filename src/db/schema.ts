import { column, Schema, Table } from '@powersync/web';

export type SetType = 'Warmup' | 'Normal' | 'Drop' | 'Failure';

export const exercisesTable = new Table({
  name: column.text,
  body_part: column.text,
  target_muscle: column.text,
  secondary_muscles: column.text,
  equipment: column.text,
  thumbnail_url: column.text,
  gif_url: column.text,
  instructions: column.text,
  muscle_group: column.text,
  is_custom: column.integer, // 0 for false, 1 for true
  user_id: column.text,
});

// Strictly called "snippets" (recurring workout structures)
export const snippetsTable = new Table({
  user_id: column.text,
  name: column.text,
  created_at: column.text,
});

export const snippet_exercises = new Table({
  snippet_id: column.text,
  exercise_id: column.text,
  sort_order: column.integer, // To maintain the order of exercises in the routine
});

export const snippetExercisesTable = snippet_exercises;

export const workoutsTable = new Table({
  user_id: column.text,
  snippet_id: column.text,
  start_time: column.text,
  end_time: column.text,
});

export const setsTable = new Table({
  workout_id: column.text,
  exercise_id: column.text,
  weight: column.real,
  reps: column.integer,
  set_type: column.text,
  logged_at: column.text,
  user_id: column.text,
});

export const profilesTable = new Table({
  username: column.text,
  age: column.integer,
  weight_kg: column.real,
  height_cm: column.real,
  created_at: column.text,
  updated_at: column.text,
});

export const AppSchema = new Schema({
  profiles: profilesTable,
  exercises: exercisesTable,
  snippets: snippetsTable,
  snippet_exercises: snippet_exercises,
  workouts: workoutsTable,
  sets: setsTable,
});

export type DatabaseSchema = typeof AppSchema;

// Types matching the Supabase / PostgreSQL schema
export interface ExerciseRecord {
  id: string; // 4-digit ID (e.g. "0001") or UUID for custom
  name: string;
  body_part?: string | null;
  target_muscle?: string | null;
  secondary_muscles?: string | null;
  equipment?: string | null;
  thumbnail_url?: string | null;
  gif_url?: string | null;
  instructions?: string | null;
  muscle_group?: string | null;
  is_custom?: number; // 0 or 1
  user_id?: string | null;
}

export interface SnippetRecord {
  id: string; // UUID
  user_id: string;
  name: string;
  created_at: string;
}

export interface SnippetExerciseRecord {
  id: string; // UUID
  snippet_id: string;
  exercise_id: string;
  sort_order: number;
}

export interface WorkoutRecord {
  id: string; // UUID
  user_id: string;
  snippet_id?: string | null;
  start_time: string;
  end_time?: string | null;
}

export interface SetRecord {
  id: string; // UUID
  workout_id: string;
  exercise_id: string;
  weight: number;
  reps: number;
  set_type: SetType;
  logged_at: string;
  user_id?: string | null;
}
