/*
  # TOEFL Online Test System Database Schema
  
  ## Overview
  Complete database schema for TOEFL online testing platform with support for:
  - Multi-module tests (Listening, Structure, Reading)
  - Question bank with images and audio files
  - Live proctoring logs
  - Test sessions and scoring
  - Support for 100-200 concurrent users
  
  ## New Tables
  
  ### 1. `profiles`
  User profile information extending auth.users
  - `id` (uuid, FK to auth.users)
  - `full_name` (text)
  - `email` (text)
  - `role` (text: 'admin' or 'participant')
  - `avatar_url` (text, optional)
  - `created_at` (timestamptz)
  
  ### 2. `test_packages`
  Test packages (e.g., "TOEFL ITP Prediction")
  - `id` (uuid, PK)
  - `title` (text)
  - `description` (text)
  - `duration_minutes` (integer)
  - `is_active` (boolean)
  - `created_by` (uuid, FK to profiles)
  - `created_at` (timestamptz)
  
  ### 3. `test_sections`
  Sections within a test package (Listening, Structure, Reading)
  - `id` (uuid, PK)
  - `package_id` (uuid, FK to test_packages)
  - `title` (text)
  - `section_order` (integer)
  - `total_questions` (integer)
  - `duration_minutes` (integer)
  - `created_at` (timestamptz)
  
  ### 4. `questions`
  Question bank with support for images and audio
  - `id` (uuid, PK)
  - `section_id` (uuid, FK to test_sections)
  - `question_number` (integer)
  - `question_text` (text)
  - `question_image_url` (text, optional)
  - `audio_url` (text, optional)
  - `audio_duration_seconds` (integer, optional)
  - `correct_answer` (text: 'A', 'B', 'C', 'D')
  - `created_at` (timestamptz)
  
  ### 5. `question_options`
  Multiple choice options for each question
  - `id` (uuid, PK)
  - `question_id` (uuid, FK to questions)
  - `option_label` (text: 'A', 'B', 'C', 'D')
  - `option_text` (text)
  - `created_at` (timestamptz)
  
  ### 6. `test_sessions`
  Active and completed test sessions
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to profiles)
  - `package_id` (uuid, FK to test_packages)
  - `status` (text: 'in_progress', 'completed', 'abandoned')
  - `started_at` (timestamptz)
  - `completed_at` (timestamptz, optional)
  - `time_remaining_seconds` (integer)
  - `current_section_id` (uuid, FK to test_sections)
  - `current_question_number` (integer)
  - `proctoring_enabled` (boolean)
  
  ### 7. `user_answers`
  Participant answers for each question
  - `id` (uuid, PK)
  - `session_id` (uuid, FK to test_sessions)
  - `question_id` (uuid, FK to questions)
  - `selected_answer` (text: 'A', 'B', 'C', 'D')
  - `is_flagged` (boolean) - for "Ragu" feature
  - `time_spent_seconds` (integer)
  - `answered_at` (timestamptz)
  
  ### 8. `certificates`
  Test results and scoring
  - `id` (uuid, PK)
  - `session_id` (uuid, FK to test_sessions)
  - `user_id` (uuid, FK to profiles)
  - `package_id` (uuid, FK to test_packages)
  - `listening_score` (integer)
  - `structure_score` (integer)
  - `reading_score` (integer)
  - `total_score` (integer)
  - `generated_at` (timestamptz)
  
  ### 9. `proctoring_logs`
  Live proctoring activity logs
  - `id` (uuid, PK)
  - `session_id` (uuid, FK to test_sessions)
  - `event_type` (text: 'camera_blocked', 'microphone_blocked', 'tab_switch', 'face_not_detected', 'multiple_faces')
  - `event_data` (jsonb, optional)
  - `timestamp` (timestamptz)
  
  ## Security
  - RLS enabled on all tables
  - Participants can only access their own data
  - Admins have full access
  - Public cannot access any data
  
  ## Performance Optimizations
  - Indexes on foreign keys for efficient joins
  - Indexes on frequently queried fields (session status, package active status)
  - Composite indexes for common query patterns
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'participant' CHECK (role IN ('admin', 'participant')),
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create test_packages table
CREATE TABLE IF NOT EXISTS test_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 120,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE test_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active packages"
  ON test_packages FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage packages"
  ON test_packages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create test_sections table
CREATE TABLE IF NOT EXISTS test_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES test_packages(id) ON DELETE CASCADE,
  title text NOT NULL,
  section_order integer NOT NULL,
  total_questions integer NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE test_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view sections"
  ON test_sections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage sections"
  ON test_sections FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES test_sections(id) ON DELETE CASCADE,
  question_number integer NOT NULL,
  question_text text NOT NULL,
  question_image_url text,
  audio_url text,
  audio_duration_seconds integer,
  correct_answer text NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(section_id, question_number)
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view questions"
  ON questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage questions"
  ON questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create question_options table
CREATE TABLE IF NOT EXISTS question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_label text NOT NULL CHECK (option_label IN ('A', 'B', 'C', 'D')),
  option_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(question_id, option_label)
);

ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view options"
  ON question_options FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage options"
  ON question_options FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create test_sessions table
CREATE TABLE IF NOT EXISTS test_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES test_packages(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  time_remaining_seconds integer NOT NULL,
  current_section_id uuid REFERENCES test_sections(id),
  current_question_number integer DEFAULT 1,
  proctoring_enabled boolean DEFAULT true
);

ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON test_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON test_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON test_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions"
  ON test_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create user_answers table
CREATE TABLE IF NOT EXISTS user_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_answer text CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
  is_flagged boolean DEFAULT false,
  time_spent_seconds integer DEFAULT 0,
  answered_at timestamptz DEFAULT now(),
  UNIQUE(session_id, question_id)
);

ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own answers"
  ON user_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM test_sessions
      WHERE test_sessions.id = user_answers.session_id
      AND test_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own answers"
  ON user_answers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM test_sessions
      WHERE test_sessions.id = user_answers.session_id
      AND test_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all answers"
  ON user_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE REFERENCES test_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES test_packages(id) ON DELETE CASCADE,
  listening_score integer NOT NULL DEFAULT 0,
  structure_score integer NOT NULL DEFAULT 0,
  reading_score integer NOT NULL DEFAULT 0,
  total_score integer NOT NULL DEFAULT 0,
  generated_at timestamptz DEFAULT now()
);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own certificates"
  ON certificates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage certificates"
  ON certificates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create proctoring_logs table
CREATE TABLE IF NOT EXISTS proctoring_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('camera_blocked', 'microphone_blocked', 'tab_switch', 'face_not_detected', 'multiple_faces', 'session_started', 'session_ended')),
  event_data jsonb,
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE proctoring_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proctoring logs"
  ON proctoring_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM test_sessions
      WHERE test_sessions.id = proctoring_logs.session_id
      AND test_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own proctoring logs"
  ON proctoring_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM test_sessions
      WHERE test_sessions.id = proctoring_logs.session_id
      AND test_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all proctoring logs"
  ON proctoring_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_test_packages_active ON test_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_test_packages_created_by ON test_packages(created_by);

CREATE INDEX IF NOT EXISTS idx_test_sections_package ON test_sections(package_id);
CREATE INDEX IF NOT EXISTS idx_test_sections_order ON test_sections(section_order);

CREATE INDEX IF NOT EXISTS idx_questions_section ON questions(section_id);
CREATE INDEX IF NOT EXISTS idx_questions_number ON questions(section_id, question_number);

CREATE INDEX IF NOT EXISTS idx_question_options_question ON question_options(question_id);

CREATE INDEX IF NOT EXISTS idx_test_sessions_user ON test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_package ON test_sessions(package_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_status ON test_sessions(status);
CREATE INDEX IF NOT EXISTS idx_test_sessions_started ON test_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_user_answers_session ON user_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_question ON user_answers(question_id);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_session ON certificates(session_id);

CREATE INDEX IF NOT EXISTS idx_proctoring_logs_session ON proctoring_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_logs_timestamp ON proctoring_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_proctoring_logs_event_type ON proctoring_logs(event_type);