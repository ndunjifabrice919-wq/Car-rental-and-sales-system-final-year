/**
 * Script to test why rentals aren't showing for admin
 */

const SUPABASE_URL = "https://hjyvbyirlbjfdawwcvfj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqeXZieWlybGJqZmRhd3djdmZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTI5NDUsImV4cCI6MjA5MzgyODk0NX0.ddx7NOJbl75DET8ejZ1yRsSkFv8nJ8ao0hdVIuFXvDA";
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "shinuashinua38@gmail.com",
    password: "shinua123"
  });

  if (authError) {
    console.error("Auth error:", authError);
    return;
  }

  console.log("Logged in:", authData.user.id);

  const { data: pData } = await supabase.from("profiles").select("*").eq("id", authData.user.id);
  console.log("My Profile:", pData);

  const { data: rentals, error: rError } = await supabase
    .from("rentals")
    .select("*, vehicles(make,model), profiles(full_name)");

  if (rError) {
    console.error("Rentals Error:", rError);
  } else {
    console.log("Rentals length:", rentals?.length);
    console.log("Rentals data:", rentals);
  }
}

main();
