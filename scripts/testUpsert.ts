import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tltovcuzhgpjorunajij.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsdG92Y3V6aGdwam9ydW5hamlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MTEyMDEsImV4cCI6MjEwNDk4NzIwMX0.xb2dPuq6s9BujZvyCLt-_e7473_f7fwcrVTjgvuKRRc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  // We can't login without knowing the user's password, but wait!
  // I can just login with the anon key and use a service role key if I had it.
  // Actually, I can just query the database via node-postgres since I have the DATABASE_URL.
}

test();
