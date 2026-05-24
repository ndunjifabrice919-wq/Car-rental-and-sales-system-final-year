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
⚠️ SUPABASE RLS POLICIES NEED UPDATING FOR "ADMIN/OWNER" ⚠️
=========================================================

The current Row Level Security (RLS) policies only give access to 'admin' and restrict profile selection/update to the user's own profile.
This prevents Admins and Owners from seeing other users and verifying their ID documents!

Please go to Supabase Dashboard -> SQL Editor, and run this EXACT SQL:

---------------------------------------------------------
-- 1. Create a security definer helper function to bypass RLS recursion
create or replace function public.is_admin_or_owner(user_id uuid)
returns boolean as $$
declare
  has_access boolean;
begin
  select exists (
    select 1 
    from public.profiles 
    where id = user_id and role in ('admin', 'owner')
  ) into has_access;
  return has_access;
end;
$$ language plpgsql security definer;

-- 2. Drop existing profiles select policy and replace with recursion-safe policy
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select
  using (auth.uid() = id or public.is_admin_or_owner(auth.uid()));

-- 3. Drop existing profiles update policy and replace with admin/owner-friendly policy
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update
  using (auth.uid() = id or public.is_admin_or_owner(auth.uid()));

-- 4. Fix Vehicles access (Owners and Admins can manage vehicles)
drop policy if exists "vehicles_insert_admin" on public.vehicles;
create policy "vehicles_insert_admin" on public.vehicles for insert
  with check (public.is_admin_or_owner(auth.uid()));

drop policy if exists "vehicles_update_admin" on public.vehicles;
create policy "vehicles_update_admin" on public.vehicles for update
  using (public.is_admin_or_owner(auth.uid()));

drop policy if exists "vehicles_delete_admin" on public.vehicles;
create policy "vehicles_delete_admin" on public.vehicles for delete
  using (public.is_admin_or_owner(auth.uid()));

-- 5. Fix Rentals access (Admins & Owners can see and manage all rentals)
drop policy if exists "rentals_select" on public.rentals;
create policy "rentals_select" on public.rentals for select
  using (auth.uid() = user_id or public.is_admin_or_owner(auth.uid()));

drop policy if exists "rentals_update" on public.rentals;
create policy "rentals_update" on public.rentals for update
  using (auth.uid() = user_id or public.is_admin_or_owner(auth.uid()));

-- 6. Fix Sales access (Admins & Owners can see all sales)
drop policy if exists "sales_select" on public.sales;
create policy "sales_select" on public.sales for select
  using (auth.uid() = user_id or public.is_admin_or_owner(auth.uid()));

-- 7. Fix Realtime publication
alter publication supabase_realtime add table vehicles, rentals, sales, profiles;
---------------------------------------------------------

Once you run this, refresh your Admin Dashboard and ALL rentals, users, and vehicles will appear!
`);
