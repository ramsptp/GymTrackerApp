import { PowerSyncDatabase } from '@powersync/capacitor';
import { v4 as uuidv4 } from 'uuid';
import { AppSchema } from './schema';
import type { SetType, ExerciseRecord, SnippetRecord } from './schema';
import { connector } from './connector';
import { supabase } from './supabase';

export const powersync = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'gym_tracker.sqlite',
  },
});

export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function getCurrentUserId(): Promise<string> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch (e) {
    console.warn('Could not fetch auth session for current user id:', e);
  }
  return DEFAULT_USER_ID;
}



export async function seedDefaultExercises() {
  try {
    const existing = await powersync.getAll<{ count: number }>('SELECT count(*) as count FROM exercises');
    // If table is empty or has fewer than 100 exercises (i.e. old placeholder set), seed all 1,324 GymVisual exercises
    if (!existing[0] || existing[0].count < 100) {
      const fallbackExercises = (await import('./fallback_exercises.json')).default;
      console.log(`Seeding ${fallbackExercises.length} GymVisual catalog exercises into local SQLite...`);
      const BATCH_SIZE = 100;
      for (let i = 0; i < fallbackExercises.length; i += BATCH_SIZE) {
        const batch = fallbackExercises.slice(i, i + BATCH_SIZE);
        await powersync.writeTransaction(async (tx) => {
          for (const ex of batch) {
            await tx.execute(
              `INSERT OR REPLACE INTO exercises (
                id, name, body_part, target_muscle, secondary_muscles,
                equipment, thumbnail_url, gif_url, instructions,
                muscle_group, is_custom, user_id
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)`,
              [
                ex.id,
                ex.name,
                ex.body_part,
                ex.target_muscle,
                ex.secondary_muscles,
                ex.equipment,
                ex.thumbnail_url,
                ex.gif_url,
                ex.instructions,
                ex.muscle_group,
              ]
            );
          }
        });
      }
    }

    // Seed initial starter snippets (recurring workout structures) if snippets table is empty
    const existingSnippets = await powersync.getAll<{ count: number }>('SELECT count(*) as count FROM snippets');
    if (!existingSnippets[0] || existingSnippets[0].count === 0) {
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

    // Seed initial starter snippet exercises if snippet_exercises is empty
    const existingSE = await powersync.getAll<{ count: number }>('SELECT count(*) as count FROM snippet_exercises');
    if (!existingSE[0] || existingSE[0].count === 0) {
      const allEx = await powersync.getAll<ExerciseRecord>('SELECT * FROM exercises');
      const findExId = (name: string) => allEx.find((e) => e.name.toLowerCase().includes(name.toLowerCase()))?.id;

      const allSnippets = await powersync.getAll<SnippetRecord>('SELECT * FROM snippets');
      const pushSnip = allSnippets.find((s) => s.name.toLowerCase().includes('push'));
      const pullSnip = allSnippets.find((s) => s.name.toLowerCase().includes('pull'));
      const legsSnip = allSnippets.find((s) => s.name.toLowerCase().includes('legs'));

      await powersync.writeTransaction(async (tx) => {
        if (pushSnip) {
          const pushExs = ['bench press', 'incline', 'overhead', 'pushdown']
            .map(findExId)
            .filter(Boolean) as string[];
          for (let i = 0; i < pushExs.length; i++) {
            await tx.execute(
              'INSERT INTO snippet_exercises (id, snippet_id, exercise_id, sort_order) VALUES (?, ?, ?, ?)',
              [uuidv4(), pushSnip.id, pushExs[i], i]
            );
          }
        }
        if (pullSnip) {
          const pullExs = ['deadlift', 'pull-up', 'row', 'curl']
            .map(findExId)
            .filter(Boolean) as string[];
          for (let i = 0; i < pullExs.length; i++) {
            await tx.execute(
              'INSERT INTO snippet_exercises (id, snippet_id, exercise_id, sort_order) VALUES (?, ?, ?, ?)',
              [uuidv4(), pullSnip.id, pullExs[i], i]
            );
          }
        }
        if (legsSnip) {
          const legsExs = ['squat', 'deadlift', 'leg press', 'sit-up']
            .map(findExId)
            .filter(Boolean) as string[];
          for (let i = 0; i < legsExs.length; i++) {
            await tx.execute(
              'INSERT INTO snippet_exercises (id, snippet_id, exercise_id, sort_order) VALUES (?, ?, ?, ?)',
              [uuidv4(), legsSnip.id, legsExs[i], i]
            );
          }
        }
      });
    }
  } catch (err) {
    console.error('Error seeding initial SQLite database:', err);
  }
}

export async function connectSync() {
  if (connector.isConfigured()) {
    try {
      await powersync.connect(connector);
    } catch (err) {
      console.warn('PowerSync connect warning:', err);
    }
  }
}

export async function disconnectAndClearData() {
  try {
    await powersync.disconnectAndClear({ clearLocal: true });
    // Re-seed default exercises so the app continues functioning smoothly for next user
    await seedDefaultExercises();
  } catch (err) {
    console.error('Error disconnecting and clearing PowerSync data:', err);
  }
}

export async function migrateGuestDataToUser(newUserId: string) {
  if (!newUserId || newUserId === DEFAULT_USER_ID) return;

  try {
    await powersync.writeTransaction(async (tx) => {
      // 1. Reassign guest snippets
      await tx.execute(
        'UPDATE snippets SET user_id = ? WHERE user_id = ? OR user_id = ?',
        [newUserId, DEFAULT_USER_ID, 'default_user']
      );

      // 2. Reassign guest workouts
      await tx.execute(
        'UPDATE workouts SET user_id = ? WHERE user_id = ? OR user_id = ?',
        [newUserId, DEFAULT_USER_ID, 'default_user']
      );

      // 3. Reassign guest sets
      await tx.execute(
        'UPDATE sets SET user_id = ? WHERE user_id = ? OR user_id = ?',
        [newUserId, DEFAULT_USER_ID, 'default_user']
      );

      // 4. Reassign custom exercises
      await tx.execute(
        'UPDATE exercises SET user_id = ? WHERE is_custom = 1 AND (user_id = ? OR user_id = ?)',
        [newUserId, DEFAULT_USER_ID, 'default_user']
      );
    });
  } catch (err) {
    console.error('Error during guest data migration:', err);
  }
}

export async function initDatabase() {
  await powersync.init();

  // Connect only if authenticated session is already available
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && connector.isConfigured()) {
      await powersync.connect(connector);
    }
  } catch (err) {
    console.warn('Could not auto-connect sync on init:', err);
  }

  // Seed default exercises in the background so it doesn't block the UI thread
  seedDefaultExercises().catch(e => console.error('Seeding failed:', e));
}

// Database helper functions (All UUIDs generated on client side)
export async function createExercise(
  name: string,
  muscle_group: string,
  userId?: string,
  extra?: {
    body_part?: string;
    target_muscle?: string;
    secondary_muscles?: string;
    equipment?: string;
    thumbnail_url?: string;
    gif_url?: string;
    instructions?: string;
  }
) {
  const activeUserId = userId ?? (await getCurrentUserId());
  const id = uuidv4();
  await powersync.execute(
    `INSERT INTO exercises (
      id, name, muscle_group, body_part, target_muscle, secondary_muscles,
      equipment, thumbnail_url, gif_url, instructions, is_custom, user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [
      id,
      name,
      muscle_group,
      extra?.body_part || muscle_group.toLowerCase(),
      extra?.target_muscle || muscle_group.toLowerCase(),
      extra?.secondary_muscles || '[]',
      extra?.equipment || 'custom',
      extra?.thumbnail_url || null,
      extra?.gif_url || null,
      extra?.instructions || null,
      activeUserId,
    ]
  );
  return id;
}

export async function createSnippet(
  name: string,
  exerciseIds: string[] = [],
  userId?: string
) {
  const activeUserId = userId ?? (await getCurrentUserId());
  const id = uuidv4();
  const createdAt = new Date().toISOString();

  await powersync.writeTransaction(async (tx) => {
    await tx.execute(
      'INSERT INTO snippets (id, user_id, name, created_at) VALUES (?, ?, ?, ?)',
      [id, activeUserId, name, createdAt]
    );

    for (let i = 0; i < exerciseIds.length; i++) {
      const seId = uuidv4();
      await tx.execute(
        'INSERT INTO snippet_exercises (id, snippet_id, exercise_id, sort_order) VALUES (?, ?, ?, ?)',
        [seId, id, exerciseIds[i], i]
      );
    }
  });

  return id;
}

export async function deleteSnippet(snippetId: string) {
  await powersync.writeTransaction(async (tx) => {
    await tx.execute('DELETE FROM snippet_exercises WHERE snippet_id = ?', [snippetId]);
    await tx.execute('DELETE FROM snippets WHERE id = ?', [snippetId]);
  });
}

export async function updateSnippet(
  snippetId: string,
  name: string,
  exerciseIds: string[] = []
) {
  await powersync.writeTransaction(async (tx) => {
    await tx.execute('UPDATE snippets SET name = ? WHERE id = ?', [name, snippetId]);
    await tx.execute('DELETE FROM snippet_exercises WHERE snippet_id = ?', [snippetId]);

    for (let i = 0; i < exerciseIds.length; i++) {
      const seId = uuidv4();
      await tx.execute(
        'INSERT INTO snippet_exercises (id, snippet_id, exercise_id, sort_order) VALUES (?, ?, ?, ?)',
        [seId, snippetId, exerciseIds[i], i]
      );
    }
  });
}

export async function getSnippetById(snippetId: string): Promise<SnippetRecord | null> {
  return await powersync.getOptional<SnippetRecord>(
    'SELECT * FROM snippets WHERE id = ?',
    [snippetId]
  );
}

export async function getSnippetExercises(snippetId: string): Promise<ExerciseRecord[]> {
  return await powersync.getAll<ExerciseRecord>(
    `SELECT e.* FROM snippet_exercises se
     JOIN exercises e ON se.exercise_id = e.id
     WHERE se.snippet_id = ?
     ORDER BY se.sort_order ASC`,
    [snippetId]
  );
}

export async function startWorkout(snippetId?: string, userId?: string) {
  const activeUserId = userId ?? (await getCurrentUserId());
  const id = uuidv4();
  const startTime = new Date().toISOString();
  await powersync.execute(
    'INSERT INTO workouts (id, user_id, snippet_id, start_time, end_time) VALUES (?, ?, ?, ?, NULL)',
    [id, activeUserId, snippetId || null, startTime]
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
  userId?: string;
}) {
  const activeUserId = params.userId ?? (await getCurrentUserId());
  const id = uuidv4();
  const loggedAt = new Date().toISOString();
  await powersync.execute(
    'INSERT INTO sets (id, workout_id, exercise_id, weight, reps, set_type, logged_at, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, params.workoutId, params.exerciseId, params.weight, params.reps, params.setType, loggedAt, activeUserId]
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
