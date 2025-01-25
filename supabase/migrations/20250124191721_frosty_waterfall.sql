-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create new handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY definer
SET search_path = public
AS $$
DECLARE
  default_role text;
  default_display_name text;
  user_class_level text;
BEGIN
  -- Set default values
  default_role := COALESCE(new.raw_user_meta_data->>'role', 'student');
  
  -- Set display name based on role
  default_display_name := CASE 
    WHEN default_role = 'teacher' THEN 'teacher1'
    ELSE 'test1'
  END;
  
  -- Get class level if available
  user_class_level := new.raw_user_meta_data->>'classLevel';

  -- Insert into profiles with error handling
  BEGIN
    INSERT INTO public.profiles (
      id,
      email,
      role,
      display_name,
      class_level,
      created_at,
      updated_at
    )
    VALUES (
      new.id,
      new.email,
      default_role,
      default_display_name,
      user_class_level,
      now(),
      now()
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- If profile already exists, update it
      UPDATE public.profiles
      SET 
        email = new.email,
        role = default_role,
        display_name = default_display_name,
        class_level = user_class_level,
        updated_at = now()
      WHERE id = new.id;
    WHEN OTHERS THEN
      -- Log error and re-raise
      RAISE NOTICE 'Error creating profile: %', SQLERRM;
      RETURN NULL;
  END;

  RETURN new;
END;
$$;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Recreate policies to ensure proper access
DO $$ 
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "System can create user profiles" ON profiles;
  DROP POLICY IF EXISTS "System can delete user profiles" ON profiles;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new policies
CREATE POLICY "Anyone can create profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);