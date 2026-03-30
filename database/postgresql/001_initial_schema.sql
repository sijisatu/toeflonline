CREATE OR REPLACE FUNCTION app_uuid() RETURNS uuid AS $$
  SELECT (
    substr(seed, 1, 8) || '-' ||
    substr(seed, 9, 4) || '-' ||
    '4' || substr(seed, 14, 3) || '-' ||
    substr('89ab', floor(random() * 4)::int + 1, 1) || substr(seed, 18, 3) || '-' ||
    substr(seed, 21, 12)
  )::uuid
  FROM (
    SELECT md5(random()::text || clock_timestamp()::text || random()::text) AS seed
  ) AS generated;
$$ LANGUAGE SQL VOLATILE;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT app_uuid(),
  email varchar(255) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name varchar(255) NOT NULL,
  role varchar(20) NOT NULL CHECK (role IN ('admin', 'participant')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_packages (
  id uuid PRIMARY KEY DEFAULT app_uuid(),
  title varchar(255) NOT NULL,
  description text,
  duration_minutes integer NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_sections (
  id uuid PRIMARY KEY DEFAULT app_uuid(),
  package_id uuid NOT NULL REFERENCES test_packages(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  section_order integer NOT NULL,
  total_questions integer NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id, section_order)
);

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT app_uuid(),
  section_id uuid NOT NULL REFERENCES test_sections(id) ON DELETE CASCADE,
  question_number integer NOT NULL,
  question_text text NOT NULL,
  question_image_url text,
  audio_url text,
  audio_duration_seconds integer,
  correct_answer varchar(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section_id, question_number)
);

CREATE TABLE IF NOT EXISTS question_options (
  id uuid PRIMARY KEY DEFAULT app_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_label varchar(1) NOT NULL CHECK (option_label IN ('A', 'B', 'C', 'D')),
  option_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, option_label)
);

CREATE TABLE IF NOT EXISTS test_sessions (
  id uuid PRIMARY KEY DEFAULT app_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  package_id uuid NOT NULL REFERENCES test_packages(id),
  status varchar(20) NOT NULL CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  time_remaining_seconds integer NOT NULL,
  current_section_id uuid REFERENCES test_sections(id),
  current_question_number integer NOT NULL DEFAULT 1,
  proctoring_enabled boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS user_answers (
  id uuid PRIMARY KEY DEFAULT app_uuid(),
  session_id uuid NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_answer varchar(1) CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
  is_flagged boolean NOT NULL DEFAULT false,
  time_spent_seconds integer NOT NULL DEFAULT 0,
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id)
);

CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT app_uuid(),
  session_id uuid NOT NULL UNIQUE REFERENCES test_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  package_id uuid NOT NULL REFERENCES test_packages(id),
  listening_score integer NOT NULL DEFAULT 0,
  structure_score integer NOT NULL DEFAULT 0,
  reading_score integer NOT NULL DEFAULT 0,
  total_score integer NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proctoring_logs (
  id uuid PRIMARY KEY DEFAULT app_uuid(),
  session_id uuid NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
  event_type varchar(40) NOT NULL,
  event_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proctoring_snapshots (
  id uuid PRIMARY KEY DEFAULT app_uuid(),
  session_id uuid NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  violation_reason varchar(100)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_test_packages_active ON test_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_test_sections_package_id ON test_sections(package_id);
CREATE INDEX IF NOT EXISTS idx_questions_section_id ON questions(section_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id ON test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_status ON test_sessions(status);
CREATE INDEX IF NOT EXISTS idx_user_answers_session_id ON user_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_logs_session_id ON proctoring_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_logs_created_at ON proctoring_logs(created_at DESC);
