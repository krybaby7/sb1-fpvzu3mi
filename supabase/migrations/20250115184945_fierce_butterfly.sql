/*
  # Fix chat messages policy for teacher access

  1. Changes
    - Drop existing policy for viewing chat messages
    - Create new policy that properly allows teachers to view all student messages
    - Add index on student_id and created_at for better query performance

  2. Security
    - Maintains RLS
    - Students can still only view their own messages
    - Teachers can view all student messages
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Students can view their own messages" ON chat_messages;

-- Create new policy with proper teacher access
CREATE POLICY "Chat messages access policy"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    -- Students can only view their own messages
    student_id = auth.uid() 
    OR 
    -- Teachers can view all messages
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- Add index for better performance
CREATE INDEX IF NOT EXISTS chat_messages_student_date_idx 
  ON chat_messages(student_id, created_at DESC);