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
    
    console.log('Updating RLS Policies on profiles...');
    await client.query(`
      DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
      DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
      CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
    `);
    console.log('RLS policies updated successfully!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
