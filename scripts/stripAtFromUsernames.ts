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
    console.log('Connected.');

    console.log('Stripping @ from existing usernames...');
    const result = await client.query(`
      ALTER TABLE profiles DISABLE TRIGGER enforce_username_immutability;
      UPDATE profiles 
      SET username = substring(username from 2)
      WHERE username LIKE '@%';
      ALTER TABLE profiles ENABLE TRIGGER enforce_username_immutability;
    `);
    
    console.log(`Successfully updated ${result.rowCount} profiles.`);

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

runMigration();
