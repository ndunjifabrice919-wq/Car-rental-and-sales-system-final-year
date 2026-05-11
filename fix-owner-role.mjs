/**
 * Updates the currently-registered shinua account to "owner" role.
 * Run: node fix-owner-role.mjs
 */

const SUPABASE_URL = "https://hjyvbyirlbjfdawwcvfj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqeXZieWlybGJqZmRhd3djdmZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTI5NDUsImV4cCI6MjA5MzgyODk0NX0.ddx7NOJbl75DET8ejZ1yRsSkFv8nJ8ao0hdVIuFXvDA";

async function main() {
  // Step 1: Sign in to get user ID + token
  console.log("🔐 Signing in as shinuashinua38@gmail.com...");
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "shinuashinua38@gmail.com", password: "shinua123" }),
  });
  const data = await res.json();

  if (!data.user) {
    console.error("❌ Login failed:", JSON.stringify(data, null, 2));
    return;
  }

  console.log(`✅ Signed in! User ID: ${data.user.id}`);

  // Step 2: Update profile to owner role
  console.log("🛡️  Setting role to 'owner'...");
  const updateRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${data.user.id}`,
    {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${data.access_token}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify({ role: "owner", full_name: "Shinua", phone: "+237 677 000 001" }),
    }
  );

  if (updateRes.ok) {
    const updated = await updateRes.json();
    console.log("✅ Profile updated:", JSON.stringify(updated, null, 2));
    console.log("\n🎉 DONE! Now logout and login again at http://localhost:3000/login");
    console.log("   You'll see '⚡ Owner' in the navbar!\n");
  } else {
    const errText = await updateRes.text();
    console.error("❌ Update failed:", updateRes.status, errText);
    
    if (errText.includes("check") || errText.includes("violates")) {
      console.log("\n⚠️  The 'owner' role is not allowed by a database constraint.");
      console.log("   Trying 'admin' instead...");
      
      const fallbackRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${data.user.id}`,
        {
          method: "PATCH",
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${data.access_token}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
          },
          body: JSON.stringify({ role: "admin", full_name: "Shinua", phone: "+237 677 000 001" }),
        }
      );
      
      if (fallbackRes.ok) {
        const updated = await fallbackRes.json();
        console.log("✅ Set to 'admin' role instead:", JSON.stringify(updated, null, 2));
        console.log("\n🎉 DONE! Logout and login again. You'll see 'Admin' in the navbar.");
        console.log("   To enable 'owner' role, go to Supabase → SQL Editor and run:");
        console.log("   ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;\n");
      } else {
        console.error("❌ Fallback also failed:", await fallbackRes.text());
      }
    }
  }
}

main().catch(console.error);
