/*
  # Create and configure chat messages table

  1. Changes
    - Create chat_messages table if it doesn't exist
    - Add foreign key relationship to auth.users
    - Add indexes for better performance
    - Set up RLS policies

  2. Security
    - Enable RLS
    - Create policies for proper access control
    - Ensure proper student/teacher permissions
*/

-- Create chat_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  subject text NOT NULL,
  class_level text NOT NULL,
  content text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  topics text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT chat_messages_student_id_fkey
    FOREIGN KEY (student_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_student_subject
  ON chat_messages(student_id, subject, class_level);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
  ON chat_messages(created_at DESC);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Chat messages insert policy" ON chat_messages;
DROP POLICY IF EXISTS "Chat messages access policy" ON chat_messages;

-- Create new policies
CREATE POLICY "Chat messages insert policy"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid()
  );

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