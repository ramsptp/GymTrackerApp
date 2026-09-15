import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RawExerciseItem {
  id: string;
  name: string;
  body_part?: string;
  equipment?: string;
  instructions?: {
    en?: string;
    [key: string]: string | undefined;
  };
  muscle_group?: string;
  secondary_muscles?: string[];
  target?: string;
  image?: string;
  gif_url?: string;
}

interface ProcessedExercise {
  id: string;
  name: string;
  body_part: string;
  target_muscle: string;
  secondary_muscles: string;
  equipment: string;
  thumbnail_url: string;
  gif_url: string;
  instructions: string;
  muscle_group: string;
  is_custom: number;
}

function capitalizeTitle(str: string): string {
  if (!str) return '';
  return str
    .split(' ')
    .map((word) => {
      return word
        .split('-')
        .map((part) => {
          if (part.length === 0) return '';
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join('-');
    })
    .join(' ');
}

function escapeSql(str: string | null | undefined): string {
  if (str === null || str === undefined) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

async function run() {
  const projectRoot = path.resolve(__dirname, '..');
  const sourcePath = path.join(projectRoot, 'exercises.json');

  if (!fs.existsSync(sourcePath)) {
    console.error(`Error: exercises.json not found at ${sourcePath}`);
    process.exit(1);
  }

  console.log(`Reading dataset from ${sourcePath}...`);
  const rawData: RawExerciseItem[] = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  console.log(`Parsed ${rawData.length} raw exercises.`);

  const CDN_BASE = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main';

  const processedList: ProcessedExercise[] = rawData.map((item) => {
    const cleanId = String(item.id).padStart(4, '0');
    const name = capitalizeTitle(item.name || '');
    const bodyPart = (item.body_part || '').toLowerCase();
    const targetMuscle = (item.target || '').toLowerCase();
    const secondaryMuscles = JSON.stringify(item.secondary_muscles || []);
    const equipment = (item.equipment || '').toLowerCase();
    const thumbnailUrl = item.image ? `${CDN_BASE}/${item.image}` : '';
    const gifUrl = item.gif_url ? `${CDN_BASE}/${item.gif_url}` : '';
    const instructions = item.instructions?.en || '';
    const muscleGroup = capitalizeTitle(item.muscle_group || item.body_part || 'Full Body');

    return {
      id: cleanId,
      name,
      body_part: bodyPart,
      target_muscle: targetMuscle,
      secondary_muscles: secondaryMuscles,
      equipment,
      thumbnail_url: thumbnailUrl,
      gif_url: gifUrl,
      instructions,
      muscle_group: muscleGroup,
      is_custom: 0,
    };
  });

  // 1. Output src/db/fallback_exercises.json for offline SQLite bootstrap
  const fallbackJsonPath = path.join(projectRoot, 'src', 'db', 'fallback_exercises.json');
  fs.writeFileSync(fallbackJsonPath, JSON.stringify(processedList, null, 2), 'utf8');
  console.log(`Wrote ${processedList.length} processed exercises to ${fallbackJsonPath}`);

  // 2. Output batched supabase/seed_exercises.sql in chunks of 150 rows
  const BATCH_SIZE = 150;
  const sqlChunks: string[] = [];

  sqlChunks.push('-- Batched GymVisual Exercise Catalog Seed Data (1,324 items)');
  sqlChunks.push('-- Generated automatically by scripts/seedExercises.ts\n');

  for (let i = 0; i < processedList.length; i += BATCH_SIZE) {
    const batch = processedList.slice(i, i + BATCH_SIZE);
    const valuesList = batch.map((ex) => {
      return `  (${escapeSql(ex.id)}, ${escapeSql(ex.name)}, ${escapeSql(ex.body_part)}, ${escapeSql(ex.target_muscle)}, ${escapeSql(ex.secondary_muscles)}, ${escapeSql(ex.equipment)}, ${escapeSql(ex.thumbnail_url)}, ${escapeSql(ex.gif_url)}, ${escapeSql(ex.instructions)}, ${escapeSql(ex.muscle_group)}, false, NULL)`;
    });

    const batchSql = `INSERT INTO exercises (
  id, name, body_part, target_muscle, secondary_muscles, equipment, thumbnail_url, gif_url, instructions, muscle_group, is_custom, user_id
) VALUES\n${valuesList.join(',\n')}\nON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  body_part = EXCLUDED.body_part,
  target_muscle = EXCLUDED.target_muscle,
  secondary_muscles = EXCLUDED.secondary_muscles,
  equipment = EXCLUDED.equipment,
  thumbnail_url = EXCLUDED.thumbnail_url,
  gif_url = EXCLUDED.gif_url,
  instructions = EXCLUDED.instructions,
  muscle_group = EXCLUDED.muscle_group,
  is_custom = EXCLUDED.is_custom;\n`;

    sqlChunks.push(batchSql);
  }

  const supabaseDir = path.join(projectRoot, 'supabase');
  if (!fs.existsSync(supabaseDir)) {
    fs.mkdirSync(supabaseDir, { recursive: true });
  }

  const seedSqlPath = path.join(supabaseDir, 'seed_exercises.sql');
  fs.writeFileSync(seedSqlPath, sqlChunks.join('\n'), 'utf8');
  console.log(`Generated ${sqlChunks.length - 1} SQL batches in ${seedSqlPath}`);
  console.log('Seeding script completed successfully.');
}

run().catch((err) => {
  console.error('Fatal error in seedExercises:', err);
  process.exit(1);
});
