/*
  # Fix chat messages RLS policies

  1. Changes
    - Update insert policy to allow both students and teachers to create messages
    - Keep existing select policy that allows teachers to view all messages
    - Add index for better query performance

  2. Security
    - Teachers can create and view all messages
    - Students can only create and view their own messages
*/

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Students can create their own messages" ON chat_messages;

-- Create new insert policy that allows both students and teachers
CREATE POLICY "Chat messages insert policy"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Students can only insert messages for themselves
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'student'
      )
      AND student_id = auth.uid()
    )
    OR
    -- Teachers can insert messages with their own ID
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
      )
      AND student_id = auth.uid()
    )
  );

-- Add index for better performance if it doesn't exist
CREATE INDEX IF NOT EXISTS chat_messages_subject_class_idx 
  ON chat_messages(subject, class_level);