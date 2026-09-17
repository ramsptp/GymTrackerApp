import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''; // Using anon key or service role key if available
const client = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: buckets, error } = await client.storage.listBuckets();
  console.log("Buckets:", buckets);
  console.log("Error:", error);
}
main();
