INSERT INTO users (id, email, password_hash, full_name, role, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@demo-toefl.local', 'Admin123!', 'Demo Admin', 'admin', true),
  ('22222222-2222-2222-2222-222222222222', 'participant@demo-toefl.local', 'Participant123!', 'Demo Participant', 'participant', true)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

INSERT INTO test_packages (id, title, description, duration_minutes, is_active, created_by)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'TOEFL ITP Prediction - Practice Test 1',
  'Full-length TOEFL ITP Level 1 style practice test with official section counts and timing.',
  115,
  true,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  duration_minutes = EXCLUDED.duration_minutes,
  is_active = EXCLUDED.is_active,
  created_by = EXCLUDED.created_by;

INSERT INTO test_sections (id, package_id, title, section_order, total_questions, duration_minutes)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Section 1: Listening Comprehension', 1, 50, 35),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Section 2: Structure & Written Expression', 2, 40, 25),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Section 3: Reading Comprehension', 3, 50, 55)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  section_order = EXCLUDED.section_order,
  total_questions = EXCLUDED.total_questions,
  duration_minutes = EXCLUDED.duration_minutes;

DELETE FROM question_options WHERE question_id::text LIKE 'cccccccc-cccc-cccc-cccc-%';
DELETE FROM questions WHERE id::text LIKE 'cccccccc-cccc-cccc-cccc-%';

WITH listening_base AS (
  SELECT * FROM (VALUES
    (1, 'What does the man suggest the woman do next?', 'B', ARRAY['Call the registrar immediately','Visit the language lab after lunch','Wait until next semester','Cancel the course entirely']),
    (2, 'What are the speakers mainly discussing?', 'B', ARRAY['A missed flight','A change in class schedule','A library fine','A research deadline']),
    (3, 'What can be inferred about the professor?', 'C', ARRAY['He rarely answers email','He postponed the exam','He expects students to attend office hours','He is new to the department']),
    (4, 'What does the woman mean?', 'B', ARRAY['The report is almost finished','The data still needs to be checked','The meeting has been canceled','The assistant already submitted everything']),
    (5, 'Why is the student concerned?', 'B', ARRAY['He forgot his student card','He may not meet the scholarship requirement','He cannot find the classroom','He lost his textbook'])
  ) AS t(template_no, question_text, correct_answer, options)
),
listening_questions AS (
  SELECT
    g AS question_number,
    ('cccccccc-cccc-cccc-cccc-' || lpad(g::text, 12, '0'))::uuid AS question_id,
    format('%s (Listening item %s)', lb.question_text, g) AS question_text,
    lb.correct_answer,
    lb.options
  FROM generate_series(1, 50) AS g
  JOIN listening_base lb ON lb.template_no = ((g - 1) % 5) + 1
),
structure_base AS (
  SELECT * FROM (VALUES
    (1, '______ one of the most widely spoken languages in the world.', 'A', ARRAY['English is','English','That English','Being English']),
    (2, 'The committee recommended that the proposal ______ revised.', 'A', ARRAY['be','is','was','being']),
    (3, 'Not until the 19th century ______ understood.', 'B', ARRAY['electricity was','was electricity','electricity','did electricity']),
    (4, 'The book, together with several articles, ______ on the top shelf.', 'C', ARRAY['are','were','is','have been']),
    (5, 'If the weather had improved, we ______ the field trip.', 'B', ARRAY['would enjoy','would have enjoyed','had enjoyed','enjoyed'])
  ) AS t(template_no, question_text, correct_answer, options)
),
structure_questions AS (
  SELECT
    50 + g AS offset_no,
    g AS question_number,
    ('cccccccc-cccc-cccc-cccc-' || lpad((50 + g)::text, 12, '0'))::uuid AS question_id,
    format('%s (Structure item %s)', sb.question_text, g) AS question_text,
    sb.correct_answer,
    sb.options
  FROM generate_series(1, 40) AS g
  JOIN structure_base sb ON sb.template_no = ((g - 1) % 5) + 1
),
reading_base AS (
  SELECT * FROM (VALUES
    (1, 'According to the passage, why did the city expand rapidly?', 'B', ARRAY['New farming methods increased production','Trade routes shifted toward the coast','A royal family moved there permanently','The climate became cooler']),
    (2, 'The word "scarce" in the passage is closest in meaning to ______.', 'A', ARRAY['limited','valuable','hidden','temporary']),
    (3, 'Which of the following is NOT mentioned as an effect of urbanization?', 'D', ARRAY['Increased traffic congestion','Higher demand for housing','Improved access to education','A decline in international trade']),
    (4, 'The author implies that conservation efforts were successful because they ______.', 'B', ARRAY['received consistent funding','involved local communities','reduced tourism completely','eliminated industrial activity']),
    (5, 'What is the main purpose of the passage?', 'B', ARRAY['To compare two competing scientific theories','To describe how a policy evolved over time','To argue against public transportation','To summarize a fictional narrative'])
  ) AS t(template_no, question_text, correct_answer, options)
),
reading_questions AS (
  SELECT
    90 + g AS offset_no,
    g AS question_number,
    ('cccccccc-cccc-cccc-cccc-' || lpad((90 + g)::text, 12, '0'))::uuid AS question_id,
    format('%s (Reading item %s)', rb.question_text, g) AS question_text,
    rb.correct_answer,
    rb.options
  FROM generate_series(1, 50) AS g
  JOIN reading_base rb ON rb.template_no = ((g - 1) % 5) + 1
)
INSERT INTO questions (id, section_id, question_number, question_text, audio_url, audio_duration_seconds, correct_answer)
SELECT question_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid, question_number, question_text, NULL, NULL::integer, correct_answer FROM listening_questions
UNION ALL
SELECT question_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid, question_number, question_text, NULL, NULL::integer, correct_answer FROM structure_questions
UNION ALL
SELECT question_id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3'::uuid, question_number, question_text, NULL, NULL::integer, correct_answer FROM reading_questions;

WITH all_questions AS (
  SELECT id, correct_answer,
    CASE
      WHEN section_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid THEN ARRAY['Call the registrar immediately','Visit the language lab after lunch','Wait until next semester','Cancel the course entirely']::text[]
      WHEN section_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid THEN ARRAY['English is','English','That English','Being English']::text[]
      ELSE ARRAY['New farming methods increased production','Trade routes shifted toward the coast','A royal family moved there permanently','The climate became cooler']::text[]
    END AS fallback_options,
    question_text
  FROM questions
  WHERE id::text LIKE 'cccccccc-cccc-cccc-cccc-%'
),
resolved_options AS (
  SELECT
    q.id AS question_id,
    labels.option_label,
    CASE labels.option_label
      WHEN 'A' THEN source.options[1]
      WHEN 'B' THEN source.options[2]
      WHEN 'C' THEN source.options[3]
      ELSE source.options[4]
    END AS option_text
  FROM questions q
  JOIN LATERAL (
    SELECT CASE
      WHEN q.section_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'::uuid THEN
        CASE ((q.question_number - 1) % 5) + 1
          WHEN 1 THEN ARRAY['Call the registrar immediately','Visit the language lab after lunch','Wait until next semester','Cancel the course entirely']::text[]
          WHEN 2 THEN ARRAY['A missed flight','A change in class schedule','A library fine','A research deadline']::text[]
          WHEN 3 THEN ARRAY['He rarely answers email','He postponed the exam','He expects students to attend office hours','He is new to the department']::text[]
          WHEN 4 THEN ARRAY['The report is almost finished','The data still needs to be checked','The meeting has been canceled','The assistant already submitted everything']::text[]
          ELSE ARRAY['He forgot his student card','He may not meet the scholarship requirement','He cannot find the classroom','He lost his textbook']::text[]
        END
      WHEN q.section_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'::uuid THEN
        CASE ((q.question_number - 1) % 5) + 1
          WHEN 1 THEN ARRAY['English is','English','That English','Being English']::text[]
          WHEN 2 THEN ARRAY['be','is','was','being']::text[]
          WHEN 3 THEN ARRAY['electricity was','was electricity','electricity','did electricity']::text[]
          WHEN 4 THEN ARRAY['are','were','is','have been']::text[]
          ELSE ARRAY['would enjoy','would have enjoyed','had enjoyed','enjoyed']::text[]
        END
      ELSE
        CASE ((q.question_number - 1) % 5) + 1
          WHEN 1 THEN ARRAY['New farming methods increased production','Trade routes shifted toward the coast','A royal family moved there permanently','The climate became cooler']::text[]
          WHEN 2 THEN ARRAY['limited','valuable','hidden','temporary']::text[]
          WHEN 3 THEN ARRAY['Increased traffic congestion','Higher demand for housing','Improved access to education','A decline in international trade']::text[]
          WHEN 4 THEN ARRAY['received consistent funding','involved local communities','reduced tourism completely','eliminated industrial activity']::text[]
          ELSE ARRAY['To compare two competing scientific theories','To describe how a policy evolved over time','To argue against public transportation','To summarize a fictional narrative']::text[]
        END
    END AS options
  ) AS source ON true
  CROSS JOIN (VALUES ('A'),('B'),('C'),('D')) AS labels(option_label)
  WHERE q.id::text LIKE 'cccccccc-cccc-cccc-cccc-%'
)
INSERT INTO question_options (question_id, option_label, option_text)
SELECT question_id, option_label, option_text
FROM resolved_options;
