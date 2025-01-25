-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create new handle_new_user function with better null handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Default to 'student' if role is not provided
  -- Default to 'test1' for students and 'teacher1' for teachers
  -- Handle the case where raw_user_meta_data might be null
  INSERT INTO public.profiles (
    id,
    email,
    role,
    display_name,
    class_level
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(
      CASE 
        WHEN new.raw_user_meta_data IS NULL THEN 'student'
        ELSE new.raw_user_meta_data->>'role'
      END,
      'student'
    ),
    CASE 
      WHEN new.raw_user_meta_data IS NULL THEN 'test1'
      WHEN new.raw_user_meta_data->>'role' = 'teacher' THEN 'teacher1'
      ELSE 'test1'
    END,
    CASE 
      WHEN new.raw_user_meta_data IS NULL THEN NULL
      ELSE new.raw_user_meta_data->>'classLevel'
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY definer;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();