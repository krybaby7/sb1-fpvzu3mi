-- Add INSERT policy for profiles table
CREATE POLICY "System can create user profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add DELETE policy for profiles table
CREATE POLICY "System can delete user profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);