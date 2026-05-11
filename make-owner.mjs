/**
 * Fixes the profile by ensuring the row exists and is set to 'owner'
 * Run with: node make-owner.mjs
 */

const SUPABASE_URL = "https://hjyvbyirlbjfdawwcvfj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqeXZieWlybGJqZmRhd3djdmZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTI5NDUsImV4cCI6MjA5MzgyODk0NX0.ddx7NOJbl75DET8ejZ1yRsSkFv8nJ8ao0hdVIuFXvDA";

async function main() {
  console.log("🔐 Signing in as shinuashinua38@gmail.com...");
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "shinuashinua38@gmail.com", password: "shinua123" }),
  });
  const data = await res.json();

  if (!data.user) {
    console.error("❌ Login failed:", data);
    return;
  }

  const userId = data.user.id;
  const token = data.access_token;
  console.log(`✅ Signed in! User ID: ${userId}`);

  // UPSERT the profile to guarantee it exists and has the 'owner' role
  console.log("🛡️ Upserting profile to 'owner'...");
  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST", // POST with ON CONFLICT does an upsert
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation, resolution=merge-duplicates"
    },
    body: JSON.stringify({ 
      id: userId, 
      role: "owner", 
      full_name: "Shinua", 
      phone: "+237 677 000 001" 
    }),
  });

  const upserted = await upsertRes.json();
  console.log("✅ Profile is now:", JSON.stringify(upserted, null, 2));
}

main().catch(console.error);
