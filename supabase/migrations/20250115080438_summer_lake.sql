-- Create chat_messages table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_messages') THEN
    CREATE TABLE chat_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid REFERENCES auth.users(id) NOT NULL,
      subject text NOT NULL,
      class_level text NOT NULL,
      content text NOT NULL,
      role text NOT NULL CHECK (role IN ('user', 'assistant')),
      topics text[] DEFAULT '{}',
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Create conversation_topics table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversation_topics') THEN
    CREATE TABLE conversation_topics (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      subject text NOT NULL,
      topic text NOT NULL,
      parent_topic uuid REFERENCES conversation_topics(id),
      created_at timestamptz DEFAULT now(),
      UNIQUE (subject, topic)
    );
  END IF;
END $$;

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_topics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and create new ones
DO $$ 
BEGIN
  -- Drop existing policies for chat_messages
  DROP POLICY IF EXISTS "Students can create their own messages" ON chat_messages;
  DROP POLICY IF EXISTS "Students can view their own messages" ON chat_messages;
  
  -- Drop existing policies for conversation_topics
  DROP POLICY IF EXISTS "Everyone can view topics" ON conversation_topics;
  DROP POLICY IF EXISTS "Teachers can manage topics" ON conversation_topics;
END $$;

-- Create new policies for chat_messages
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

-- Create new policies for conversation_topics
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