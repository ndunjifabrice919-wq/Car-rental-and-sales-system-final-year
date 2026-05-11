/**
 * Run this script to update RLS policies to allow 'owner' role to manage everything.
 * Run with: node update-rls.mjs
 */

const SUPABASE_URL = "https://hjyvbyirlbjfdawwcvfj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqeXZieWlybGJqZmRhd3djdmZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTI5NDUsImV4cCI6MjA5MzgyODk0NX0.ddx7NOJbl75DET8ejZ1yRsSkFv8nJ8ao0hdVIuFXvDA";

// We can't update RLS policies via REST API easily without postgres role.
// We must instruct the user to run SQL in the Supabase Dashboard.
console.log(`
=========================================================
⚠️ SUPABASE RLS POLICIES NEED UPDATING FOR "OWNER" ROLE ⚠️
=========================================================

The current Row Level Security (RLS) policies only give access to 'admin'.
Because your role is 'owner', you are being blocked from seeing rentals and profiles!

Please go to Supabase Dashboard -> SQL Editor, and run this EXACT SQL:

---------------------------------------------------------
-- 1. Fix Profiles access (Admins & Owners can see all profiles)
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select 
  using (auth.uid() = id or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin', 'owner')));

-- 2. Fix Vehicles access (Owners can manage vehicles too)
drop policy if exists "vehicles_insert_admin" on vehicles;
create policy "vehicles_insert_admin" on vehicles for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'owner')));

drop policy if exists "vehicles_update_admin" on vehicles;
create policy "vehicles_update_admin" on vehicles for update
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'owner')));

drop policy if exists "vehicles_delete_admin" on vehicles;
create policy "vehicles_delete_admin" on vehicles for delete
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'owner')));

-- 3. Fix Rentals access (Owners can see and manage all rentals)
drop policy if exists "rentals_select" on rentals;
create policy "rentals_select" on rentals for select
  using (auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'owner')));

drop policy if exists "rentals_update" on rentals;
create policy "rentals_update" on rentals for update
  using (auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'owner')));

-- 4. Fix Sales access (Owners can see all sales)
drop policy if exists "sales_select" on sales;
create policy "sales_select" on sales for select
  using (auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'owner')));

-- 5. Fix Realtime publication
alter publication supabase_realtime add table vehicles, rentals, sales, profiles;
---------------------------------------------------------

Once you run this, refresh your Admin Dashboard and ALL rentals, users, and vehicles will appear!
`);
