import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const DEFAULT_DB_URL =
  'postgresql://postgres.tltovcuzhgpjorunajij:RamsGymTracker@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';
const databaseUrl = process.env.DATABASE_URL || DEFAULT_DB_URL;

async function runDirectSeed() {
  const projectRoot = path.resolve(__dirname, '..');
  const migrationPath = path.join(projectRoot, 'supabase', 'migrations', '20260915_update_exercises_schema.sql');
  const seedPath = path.join(projectRoot, 'supabase', 'seed_exercises.sql');

  if (!fs.existsSync(seedPath)) {
    console.error(`❌ Error: Seed file not found at ${seedPath}`);
    process.exit(1);
  }

  console.log('====================================================');
  console.log('🚀 Direct Supabase Postgres Seeding Pipeline');
  console.log('====================================================');

  // Mask credentials in logged URL
  const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`🔗 Target Connection: ${maskedUrl}`);

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 15000,
  });

  try {
    console.log('⏳ Connecting to Supabase PostgreSQL database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Step 1: Apply Schema Migration (id TEXT type & GymVisual columns)
    if (fs.existsSync(migrationPath)) {
      console.log('🛠️  [Step 1/3] Ensuring exercises table schema is up to date...');
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      await client.query(migrationSql);
      console.log('✅ Schema migration applied (id column is TEXT, GymVisual columns verified).\n');
    } else {
      console.log('ℹ️  Skipping migration step (file not found).\n');
    }

    // Step 2: Stream Seed Batches
    console.log('📦 [Step 2/3] Reading and streaming seed_exercises.sql...');
    const seedContent = fs.readFileSync(seedPath, 'utf8');
    const batches = seedContent
      .split(/(?=INSERT INTO exercises)/g)
      .map((b) => b.trim())
      .filter((b) => b.startsWith('INSERT INTO exercises'));

    console.log(`📊 Found ${batches.length} batched SQL statements to execute.`);

    const startTime = Date.now();
    for (let i = 0; i < batches.length; i++) {
      const batchSql = batches[i];
      const batchStart = Date.now();
      process.stdout.write(`   ➡️  Executing batch ${i + 1}/${batches.length}... `);
      await client.query(batchSql);
      const batchDuration = ((Date.now() - batchStart) / 1000).toFixed(2);
      console.log(`done (${batchDuration}s)`);
    }

    const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 All ${batches.length} batches inserted in ${totalSeconds}s!\n`);

    // Step 3: Verification Query
    console.log('🔍 [Step 3/3] Verifying database count in Supabase...');
    const res = await client.query<{ count: string }>('SELECT count(*) as count FROM exercises');
    const totalCount = res.rows[0]?.count;
    console.log(`✅ Supabase exercises table now contains: ${totalCount} records.`);

    console.log('\n====================================================');
    console.log('🎉 Seed complete! PowerSync will now sync catalog down to clients.');
    console.log('====================================================');
  } catch (err: any) {
    console.error('\n❌ Error during direct PostgreSQL seeding:');
    console.error(err.message || err);
    if (err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
      console.error('\n💡 Network note: If direct connection on port 5432 timed out due to IPv6 routing,');
      console.error('   you can use Supabase Connection Pooling string (port 6543) from Supabase Dashboard:');
      console.error('   Project Settings -> Database -> Connection Pooling (Session or Transaction mode)');
    }
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

runDirectSeed();
