import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function runBackfill() {
  const envPath = path.join(rootDir, '.env.local');
  let connectionString = process.env.DATABASE_URL;

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/^DATABASE_URL=(.*)$/m);
    if (match) {
      connectionString = match[1].trim();
    }
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB. Backfilling profiles for existing users...');
    const res = await client.query(`
      INSERT INTO public.profiles (id)
      SELECT id FROM auth.users
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log(`Backfill completed. Inserted ${res.rowCount} rows.`);
  } catch (err) {
    console.error('Backfill failed:', err);
  } finally {
    await client.end();
  }
}

runBackfill();
