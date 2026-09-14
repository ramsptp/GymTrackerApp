import { column, Schema, Table } from '@powersync/web';

export type SetType = 'Warmup' | 'Normal' | 'Drop' | 'Failure';

export const exercisesTable = new Table({
  name: column.text,
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
});

export const AppSchema = new Schema({
  exercises: exercisesTable,
  snippets: snippetsTable,
  workouts: workoutsTable,
  sets: setsTable,
});

export type DatabaseSchema = typeof AppSchema;

// Types matching the Supabase / PostgreSQL schema
export interface ExerciseRecord {
  id: string; // UUID
  name: string;
  muscle_group: string;
  is_custom: number; // 0 or 1
  user_id?: string | null;
}

export interface SnippetRecord {
  id: string; // UUID
  user_id: string;
  name: string;
  created_at: string;
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
}
