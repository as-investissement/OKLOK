/*
  # Create is_admin function

  1. New Functions
    - `is_admin()` - Returns boolean indicating if current user is admin
      - Checks if authenticated user exists in users table with role 'admin'
      - Uses SECURITY DEFINER for elevated privileges
      - Returns false if user not found or not admin

  2. Security
    - Function uses SECURITY DEFINER to access users table
    - Grants execute permission to authenticated users
    - Safe to call from RLS policies and client code
*/

-- Create the is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;