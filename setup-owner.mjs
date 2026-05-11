/**
 * One-time script to create the Owner account for DriveEasy.
 * Run with: node setup-owner.mjs
 */

const SUPABASE_URL = "https://hjyvbyirlbjfdawwcvfj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqeXZieWlybGJqZmRhd3djdmZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTI5NDUsImV4cCI6MjA5MzgyODk0NX0.ddx7NOJbl75DET8ejZ1yRsSkFv8nJ8ao0hdVIuFXvDA";

const EMAIL = "shinuashinua38gmail@gmail.com";
const PASSWORD = "shinua123";
const FULL_NAME = "Shinua";
const PHONE = "+237 677 000 001";

async function main() {
  console.log("🚀 Setting up DriveEasy Owner Account...\n");

  // Step 1: Sign up
  console.log("1️⃣ Registering account...");
  const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      data: { full_name: FULL_NAME, phone: PHONE },
    }),
  });

  const signupData = await signupRes.json();

  if (signupData.error && !signupData.error.message?.includes("already")) {
    console.error("❌ Signup failed:", signupData.error.message || signupData.msg);
    // Try to sign in instead (maybe already registered)
  }

  // Step 2: Sign in to get the user ID
  console.log("2️⃣ Signing in...");
  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  const loginData = await loginRes.json();

  if (!loginData.user) {
    console.error("❌ Login failed:", loginData.error_description || loginData.msg || JSON.stringify(loginData));
    console.log("\n⚠️  If the account needs email confirmation, go to Supabase Dashboard → Authentication → Users,");
    console.log("   find the user, and click 'Confirm email'. Then run this script again.\n");
    return;
  }

  const userId = loginData.user.id;
  const accessToken = loginData.access_token;
  console.log(`   ✅ Logged in as ${loginData.user.email} (ID: ${userId})`);

  // Step 3: Upsert profile with 'owner' role
  console.log("3️⃣ Setting up profile with 'owner' role...");
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: "GET",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${accessToken}`,
    },
  });
  const existingProfile = await profileRes.json();

  let method, url;
  if (existingProfile.length > 0) {
    // Update existing profile
    method = "PATCH";
    url = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`;
  } else {
    // Insert new profile
    method = "POST";
    url = `${SUPABASE_URL}/rest/v1/profiles`;
  }

  const upsertRes = await fetch(url, {
    method,
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: JSON.stringify({
      id: userId,
      full_name: FULL_NAME,
      phone: PHONE,
      role: "owner",
    }),
  });

  if (upsertRes.ok) {
    console.log("   ✅ Profile set to 'owner' role!");
  } else {
    const errText = await upsertRes.text();
    console.error("   ❌ Profile update failed:", errText);
    console.log("\n⚠️  The role constraint might not allow 'owner' yet.");
    console.log("   Go to Supabase → SQL Editor and run:");
    console.log("   ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;");
    console.log("   Then run this script again.\n");
    return;
  }

  console.log("\n══════════════════════════════════════");
  console.log("✅ OWNER ACCOUNT READY!");
  console.log("══════════════════════════════════════");
  console.log(`📧 Email:    ${EMAIL}`);
  console.log(`🔑 Password: ${PASSWORD}`);
  console.log(`👤 Name:     ${FULL_NAME}`);
  console.log(`📱 Phone:    ${PHONE}`);
  console.log(`🛡️  Role:     owner`);
  console.log("══════════════════════════════════════");
  console.log("\nGo to http://localhost:3000/login and sign in!");
  console.log("You'll see '⚡ Owner' in the navbar → full admin access.\n");
}

main().catch(console.error);
