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
    await client.connect();
    
    const result = await client.query(`
      SELECT auth.users.email, profiles.username 
      FROM profiles 
      JOIN auth.users ON profiles.id = auth.users.id 
      WHERE username = 'athlete';
    `);
    
    if (result.rows.length > 0) {
        console.log('User found:', result.rows[0]);
    } else {
        console.log('User not found.');
    }

  } catch (err) {
    console.error('Query failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
