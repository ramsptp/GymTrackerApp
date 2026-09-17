import fs from 'fs';
import path from 'path';
import pg from 'pg';

function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim();
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      }
    }
  }
}
loadEnv();

const DEFAULT_DB_URL = 'postgresql://postgres.tltovcuzhgpjorunajij:RamsGymTracker@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';
const databaseUrl = process.env.DATABASE_URL || DEFAULT_DB_URL;

async function checkAvatar() {
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    await client.connect();
    
    // Check buckets
    const bucketRes = await client.query("SELECT id, name, public FROM storage.buckets WHERE id = 'avatars'");
    console.log("Bucket config:", bucketRes.rows);

    // Check policies
    const policyRes = await client.query("SELECT * FROM pg_policies WHERE tablename = 'objects'");
    console.log("Storage Policies:");
    policyRes.rows.forEach(r => console.log(r.policyname, r.cmd));

    // Check profiles
    const profileRes = await client.query("SELECT id, username, avatar_url FROM profiles");
    console.log("Profiles:", profileRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkAvatar();
