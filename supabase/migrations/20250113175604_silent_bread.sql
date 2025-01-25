/*
  # Storage policies for resource files

  1. Storage Configuration
    - Creates storage bucket 'resource-files' if it doesn't exist
    - Enables RLS on the bucket
  
  2. Storage Policies
    - Teachers can upload files
    - Authenticated users can download files
    - Teachers can delete their own uploaded files
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('resource-files', 'resource-files')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for teachers to upload files
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

-- Policy for authenticated users to download files
CREATE POLICY "Authenticated users can download files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resource-files');

-- Policy for teachers to delete their own files
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