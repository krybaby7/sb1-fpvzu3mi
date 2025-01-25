/*
  # Add conversation history tracking

  1. New Tables
    - `chat_messages`
      - `id` (uuid, primary key)
      - `student_id` (uuid, references auth.users)
      - `subject` (text)
      - `class_level` (text)
      - `content` (text)
      - `role` (text)
      - `topics` (text[])
      - `created_at` (timestamp)
    
    - `conversation_topics`
      - `id` (uuid, primary key)
      - `subject` (text)
      - `topic` (text)
      - `parent_topic` (uuid, self-reference)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for teachers to view conversations
    - Add policies for students to create messages
*/

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES auth.users(id) NOT NULL,
  subject text NOT NULL,
  class_level text NOT NULL,
  content text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  topics text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create conversation_topics table
CREATE TABLE IF NOT EXISTS conversation_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  topic text NOT NULL,
  parent_topic uuid REFERENCES conversation_topics(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (subject, topic)
);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_topics ENABLE ROW LEVEL SECURITY;

-- Policies for chat_messages
CREATE POLICY "Students can create their own messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'student'
    )
  );

CREATE POLICY "Students can view their own messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- Policies for conversation_topics
CREATE POLICY "Everyone can view topics"
  ON conversation_topics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can manage topics"
  ON conversation_topics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );