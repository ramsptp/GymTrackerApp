import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function runMigration() {
  const envPath = path.join(rootDir, '.env.local');
  let connectionString = process.env.DATABASE_URL;

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/^DATABASE_URL=(.*)$/m);
    if (match) {
      connectionString = match[1].trim();
    }
  }
  if (!connectionString) {
    console.error('Error: DATABASE_URL is not set in .env.local');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    
    console.log('Fixing workout_participants RLS policies...');
    await client.query(`
      DO $$
      DECLARE
          pol RECORD;
      BEGIN
          FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'workout_participants' LOOP
              EXECUTE format('DROP POLICY IF EXISTS %I ON public.workout_participants', pol.policyname);
          END LOOP;
      END $$;

      CREATE POLICY "Users can insert workout participants" ON public.workout_participants
        FOR INSERT WITH CHECK (true);

      CREATE POLICY "Users can update workout participants" ON public.workout_participants
        FOR UPDATE USING (true);

      CREATE POLICY "Users can delete workout participants" ON public.workout_participants
        FOR DELETE USING (true);
      
      CREATE POLICY "Users can read workout participants" ON public.workout_participants
        FOR SELECT USING (true);
    `);
    console.log('Migration successfully applied!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
