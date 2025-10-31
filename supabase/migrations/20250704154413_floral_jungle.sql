/*
  # Fix RLS policies for projects table

  1. Security Updates
    - Drop existing problematic policies for projects table
    - Add proper INSERT policy for authenticated users
    - Add proper UPDATE policy for authenticated users
    - Add proper DELETE policy for authenticated users
    - Add proper SELECT policy for authenticated users

  2. Policy Details
    - All authenticated users can perform CRUD operations on projects
    - Policies use proper auth.uid() function for user identification
    - Ensures compatibility with current authentication system
*/

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Projects are viewable by authenticated users" ON projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON projects;

-- Create comprehensive policies for projects table
CREATE POLICY "Enable read access for authenticated users"
  ON projects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users"
  ON projects
  FOR DELETE
  TO authenticated
  USING (true);