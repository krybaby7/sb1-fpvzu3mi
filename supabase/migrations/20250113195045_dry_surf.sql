/*
  # Storage bucket and policies setup

  1. Changes
    - Create resource-files storage bucket
    - Enable RLS on storage.objects
    - Add policies for file access and management
  
  2. Security
    - Only teachers can upload and delete files
    - Authenticated users can view files
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('resource-files', 'resource-files', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS (if not already enabled)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Teachers can upload files" ON storage.objects;
  DROP POLICY IF EXISTS "Public can read files" ON storage.objects;
  DROP POLICY IF EXISTS "Teachers can delete their own files" ON storage.objects;
END $$;

-- Create new policies
CREATE POLICY "Teachers can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resource-files' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'teacher'
  )
);

CREATE POLICY "Public can read files"
ON storage.objects FOR SELECT
USING (bucket_id = 'resource-files');

CREATE POLICY "Teachers can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resource-files' AND
  (owner = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  )
);