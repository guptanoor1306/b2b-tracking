-- Fix: infinite recursion in RLS policies (error 42P17)
-- Run this in Supabase SQL Editor after schema.sql

-- Improve helper: bypass RLS safely
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Agency lookup via profile.organization (no recursive projects subquery)
CREATE OR REPLACE FUNCTION get_my_agency_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT a.id
  FROM public.agencies a
  INNER JOIN public.profiles p ON p.organization = a.name
  WHERE p.id = auth.uid();
$$;

-- Drop broken policies
DROP POLICY IF EXISTS "projects_agency_select" ON projects;
DROP POLICY IF EXISTS "projects_agency_update" ON projects;
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;

-- Recreate without recursion
CREATE POLICY "projects_agency_select" ON projects FOR SELECT
  USING (
    get_my_role() = 'Agency'
    AND assigned_agency_id IN (SELECT get_my_agency_ids())
  );

CREATE POLICY "projects_agency_update" ON projects FOR UPDATE
  USING (
    get_my_role() = 'Agency'
    AND assigned_agency_id IN (SELECT get_my_agency_ids())
  );

-- Admin write on profiles (split from FOR ALL to avoid select recursion edge cases)
CREATE POLICY "profiles_insert_admin" ON profiles FOR INSERT
  WITH CHECK (get_my_role() = 'Admin');

CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE
  USING (get_my_role() = 'Admin' OR id = auth.uid());

CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE
  USING (get_my_role() = 'Admin');
