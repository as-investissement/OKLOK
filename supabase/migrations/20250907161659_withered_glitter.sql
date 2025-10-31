/*
  # Fix RLS permissions for companies table

  1. Security Updates
    - Add policy for authenticated users to update companies
    - Ensure admins can modify company data
    - Fix existing policies if needed

  2. Changes
    - Add UPDATE policy for companies table
    - Ensure proper admin access
*/

-- Enable RLS on companies table (if not already enabled)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "Companies are viewable by authenticated users" ON companies;
DROP POLICY IF EXISTS "Admins can update companies" ON companies;
DROP POLICY IF EXISTS "Admins can insert companies" ON companies;
DROP POLICY IF EXISTS "Admins can delete companies" ON companies;

-- Policy for viewing companies (all authenticated users can view)
CREATE POLICY "Companies are viewable by authenticated users"
  ON companies
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy for updating companies (only admins can update)
CREATE POLICY "Admins can update companies"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policy for inserting companies (only admins can insert)
CREATE POLICY "Admins can insert companies"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Policy for deleting companies (only admins can delete)
CREATE POLICY "Admins can delete companies"
  ON companies
  FOR DELETE
  TO authenticated
  USING (is_admin());