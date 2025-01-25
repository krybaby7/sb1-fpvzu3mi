-- Add display_name column to profiles if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS display_name text;

-- Update existing student accounts to have 'test1' as display name
UPDATE profiles
SET display_name = 'test1'
WHERE role = 'student'
AND display_name IS NULL;

-- Update existing teacher accounts to have 'teacher1' as display name
UPDATE profiles
SET display_name = 'teacher1'
WHERE role = 'teacher'
AND display_name IS NULL;

-- Make sure display_name is set on new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, display_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'role',
    CASE 
      WHEN new.raw_user_meta_data->>'role' = 'teacher' THEN 'teacher1'
      ELSE 'test1'
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY definer;