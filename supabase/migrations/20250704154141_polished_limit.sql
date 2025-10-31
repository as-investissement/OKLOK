/*
  # Add RLS policies for projects table

  1. Security Updates
    - Add INSERT policy for authenticated users to create projects
    - Add UPDATE policy for authenticated users to modify projects
    - Add DELETE policy for authenticated users to delete projects

  2. Policy Details
    - INSERT: Allow authenticated users to insert projects
    - UPDATE: Allow authenticated users to update projects
    - DELETE: Allow authenticated users to delete projects
    - All policies check for authenticated users via auth.uid()

  3. Notes
    - These policies allow any authenticated user to manage projects
    - In a production environment, you might want to restrict based on user roles
    - The existing SELECT policy remains unchanged
*/

-- Add INSERT policy for projects
CREATE POLICY "Authenticated users can insert projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add UPDATE policy for projects
CREATE POLICY "Authenticated users can update projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add DELETE policy for projects
CREATE POLICY "Authenticated users can delete projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);