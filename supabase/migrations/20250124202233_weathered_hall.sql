/*
  # Add foreign key from chat_messages to profiles

  1. Changes
    - Add foreign key constraint from chat_messages.student_id to profiles.id
    - Update RLS policies for chat_messages
    - Add performance indexes
  
  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity with proper constraints
*/

-- First ensure the chat_messages table exists with proper structure
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_messages') THEN
    CREATE TABLE chat_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid NOT NULL,
      subject text NOT NULL,
      class_level text NOT NULL,
      content text NOT NULL,
      role text NOT NULL CHECK (role IN ('user', 'assistant')),
      topics text[] DEFAULT '{}',
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Drop existing foreign key if it exists
ALTER TABLE chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_student_id_fkey;

-- Drop existing auth.users foreign key if it exists
ALTER TABLE chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_student_id_auth_fkey;

-- Add the new foreign key constraint
ALTER TABLE chat_messages
ADD CONSTRAINT chat_messages_student_id_fkey
FOREIGN KEY (student_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Create index for the foreign key if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_chat_messages_student_id
ON chat_messages(student_id);

-- Update the select query in the RLS policy
DROP POLICY IF EXISTS "Chat messages access policy" ON chat_messages;

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