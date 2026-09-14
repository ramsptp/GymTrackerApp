import { PowerSyncDatabase } from '@powersync/web';
import { v4 as uuidv4 } from 'uuid';
import { AppSchema } from './schema';
import type { SetType } from './schema';
import { connector } from './connector';

export const powersync = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'gym_tracker.db',
  },
});

export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

const INITIAL_EXERCISES = [
  { name: 'Barbell Bench Press', muscle_group: 'Chest' },
  { name: 'Incline Dumbbell Press', muscle_group: 'Chest' },
  { name: 'Chest Dips', muscle_group: 'Chest' },
  { name: 'Barbell Squat', muscle_group: 'Legs' },
  { name: 'Romanian Deadlift', muscle_group: 'Legs' },
  { name: 'Leg Press', muscle_group: 'Legs' },
  { name: 'Calf Raises', muscle_group: 'Legs' },
  { name: 'Conventional Deadlift', muscle_group: 'Back' },
  { name: 'Barbell Row', muscle_group: 'Back' },
  { name: 'Lat Pulldown', muscle_group: 'Back' },
  { name: 'Pull-Up', muscle_group: 'Back' },
  { name: 'Overhead Shoulder Press', muscle_group: 'Shoulders' },
  { name: 'Dumbbell Lateral Raise', muscle_group: 'Shoulders' },
  { name: 'Face Pull', muscle_group: 'Shoulders' },
  { name: 'Barbell Bicep Curl', muscle_group: 'Arms' },
  { name: 'Incline Dumbbell Curl', muscle_group: 'Arms' },
  { name: 'Tricep Rope Pushdown', muscle_group: 'Arms' },
  { name: 'Skull Crushers', muscle_group: 'Arms' },
  { name: 'Hanging Leg Raise', muscle_group: 'Core' },
  { name: 'Cable Woodchopper', muscle_group: 'Core' },
];

export async function initDatabase() {
  await powersync.init();

  if (connector.isConfigured()) {
    try {
      await powersync.connect(connector);
    } catch (err) {
      console.warn('Could not connect to PowerSync backend (running local SQLite):', err);
    }
  }

  // Seed default exercises if table is empty
  try {
    const existing = await powersync.getAll<{ count: number }>('SELECT count(*) as count FROM exercises');
    if (!existing[0] || existing[0].count === 0) {
      await powersync.writeTransaction(async (tx) => {
        for (const ex of INITIAL_EXERCISES) {
          await tx.execute(
            'INSERT INTO exercises (id, name, muscle_group, is_custom, user_id) VALUES (?, ?, ?, 0, NULL)',
            [uuidv4(), ex.name, ex.muscle_group]
          );
        }
      });

      // Seed initial starter snippets (recurring workout structures)
      const pushSnippetId = uuidv4();
      const pullSnippetId = uuidv4();
      const legsSnippetId = uuidv4();

      await powersync.writeTransaction(async (tx) => {
        await tx.execute(
          'INSERT INTO snippets (id, user_id, name, created_at) VALUES (?, ?, ?, ?)',
          [pushSnippetId, DEFAULT_USER_ID, 'Push A (Chest / Shoulders / Triceps)', new Date().toISOString()]
        );
        await tx.execute(
          'INSERT INTO snippets (id, user_id, name, created_at) VALUES (?, ?, ?, ?)',
          [pullSnippetId, DEFAULT_USER_ID, 'Pull A (Back / Biceps)', new Date().toISOString()]
        );
        await tx.execute(
          'INSERT INTO snippets (id, user_id, name, created_at) VALUES (?, ?, ?, ?)',
          [legsSnippetId, DEFAULT_USER_ID, 'Legs & Core', new Date().toISOString()]
        );
      });
    }
  } catch (err) {
    console.error('Error seeding initial SQLite database:', err);
  }
}

// Database helper functions (All UUIDs generated on client side)
export async function createExercise(name: string, muscle_group: string, userId: string = DEFAULT_USER_ID) {
  const id = uuidv4();
  await powersync.execute(
    'INSERT INTO exercises (id, name, muscle_group, is_custom, user_id) VALUES (?, ?, ?, 1, ?)',
    [id, name, muscle_group, userId]
  );
  return id;
}

export async function createSnippet(name: string, userId: string = DEFAULT_USER_ID) {
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  await powersync.execute(
    'INSERT INTO snippets (id, user_id, name, created_at) VALUES (?, ?, ?, ?)',
    [id, userId, name, createdAt]
  );
  return id;
}

export async function startWorkout(snippetId?: string, userId: string = DEFAULT_USER_ID) {
  const id = uuidv4();
  const startTime = new Date().toISOString();
  await powersync.execute(
    'INSERT INTO workouts (id, user_id, snippet_id, start_time, end_time) VALUES (?, ?, ?, ?, NULL)',
    [id, userId, snippetId || null, startTime]
  );
  return id;
}

export async function finishWorkout(workoutId: string) {
  const endTime = new Date().toISOString();
  await powersync.execute(
    'UPDATE workouts SET end_time = ? WHERE id = ?',
    [endTime, workoutId]
  );
}

export async function cancelWorkout(workoutId: string) {
  await powersync.writeTransaction(async (tx) => {
    await tx.execute('DELETE FROM sets WHERE workout_id = ?', [workoutId]);
    await tx.execute('DELETE FROM workouts WHERE id = ?', [workoutId]);
  });
}

export async function logSet(params: {
  workoutId: string;
  exerciseId: string;
  weight: number;
  reps: number;
  setType: SetType;
}) {
  const id = uuidv4();
  const loggedAt = new Date().toISOString();
  await powersync.execute(
    'INSERT INTO sets (id, workout_id, exercise_id, weight, reps, set_type, logged_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, params.workoutId, params.exerciseId, params.weight, params.reps, params.setType, loggedAt]
  );
  return id;
}

export async function updateSet(setId: string, weight: number, reps: number, setType: SetType) {
  await powersync.execute(
    'UPDATE sets SET weight = ?, reps = ?, set_type = ? WHERE id = ?',
    [weight, reps, setType, setId]
  );
}

export async function deleteSet(setId: string) {
  await powersync.execute('DELETE FROM sets WHERE id = ?', [setId]);
}
