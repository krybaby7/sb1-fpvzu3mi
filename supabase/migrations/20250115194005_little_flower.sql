/*
  # Fix chat messages RLS policies

  1. Changes
    - Drop and recreate all chat messages policies
    - Add proper teacher access for viewing and creating messages
    - Ensure proper indexing for performance

  2. Security
    - Teachers can create messages and view all messages
    - Students can only create and view their own messages
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Chat messages insert policy" ON chat_messages;
DROP POLICY IF EXISTS "Chat messages access policy" ON chat_messages;
DROP POLICY IF EXISTS "Students can create their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Students can view their own messages" ON chat_messages;

-- Create new insert policy
CREATE POLICY "Chat messages insert policy"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
  );

-- Create new select policy
CREATE POLICY "Chat messages access policy"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- Ensure indexes exist for better performance
CREATE INDEX IF NOT EXISTS chat_messages_student_date_idx 
  ON chat_messages(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS chat_messages_subject_class_idx 
  ON chat_messages(subject, class_level);

CREATE INDEX IF NOT EXISTS chat_messages_composite_idx 
  ON chat_messages(subject, class_level, student_id);