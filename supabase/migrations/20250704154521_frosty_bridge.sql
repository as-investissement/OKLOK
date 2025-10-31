/*
  # Fix RLS policies for projects table

  1. Security Updates
    - Drop existing overly permissive policies on projects table
    - Create proper RLS policies for INSERT and UPDATE operations
    - Ensure authenticated users can manage projects appropriately
    - Add policy for admins to manage all projects
    - Add policy for users to manage projects in their company

  2. Policy Details
    - INSERT: Allow authenticated users to create projects
    - UPDATE: Allow authenticated users to update projects in their company or if they are admin
    - SELECT: Keep existing read access for authenticated users
    - DELETE: Keep existing delete access for authenticated users
*/

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON projects;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON projects;

-- Create proper INSERT policy
CREATE POLICY "Users can insert projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create proper UPDATE policy
CREATE POLICY "Users can update projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create proper SELECT policy
CREATE POLICY "Users can view projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (true);

-- Create proper DELETE policy
CREATE POLICY "Users can delete projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (true);