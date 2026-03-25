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
  'Complete TOEFL ITP practice test with Listening, Structure, and Reading sections.',
  105,
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
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Section 1: Listening', 1, 5, 25),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Section 2: Structure & Written Expression', 2, 5, 25),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Section 3: Reading Comprehension', 3, 5, 55)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  section_order = EXCLUDED.section_order,
  total_questions = EXCLUDED.total_questions,
  duration_minutes = EXCLUDED.duration_minutes;

DELETE FROM question_options WHERE question_id LIKE 'cccccccc-cccc-cccc-cccc-%';
DELETE FROM questions WHERE id LIKE 'cccccccc-cccc-cccc-cccc-%';

INSERT INTO questions (id, section_id, question_number, question_text, audio_url, audio_duration_seconds, correct_answer)
VALUES
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 1, 'What does the man suggest the woman do next?', 'https://example.com/audio/listening-1.mp3', 12, 'B'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 2, 'What are the speakers mainly discussing?', 'https://example.com/audio/listening-2.mp3', 12, 'B'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 3, 'What can be inferred about the professor?', 'https://example.com/audio/listening-3.mp3', 12, 'C'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc4', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 4, 'What does the woman mean?', 'https://example.com/audio/listening-4.mp3', 12, 'B'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc5', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 5, 'Why is the student concerned?', 'https://example.com/audio/listening-5.mp3', 12, 'B'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc6', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 1, '______ one of the most widely spoken languages in the world.', NULL, NULL, 'A'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc7', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 2, 'The committee recommended that the proposal ______ revised.', NULL, NULL, 'A'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc8', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 3, 'Not until the 19th century ______ understood.', NULL, NULL, 'B'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc9', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 4, 'The book, together with several articles, ______ on the top shelf.', NULL, NULL, 'C'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc10', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 5, 'If the weather had improved, we ______ the field trip.', NULL, NULL, 'B'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc11', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 1, 'According to the passage, why did the city expand rapidly?', NULL, NULL, 'B'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc12', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 2, 'The word "scarce" in the passage is closest in meaning to ______.', NULL, NULL, 'A'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc13', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 3, 'Which of the following is NOT mentioned as an effect of urbanization?', NULL, NULL, 'D'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc14', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 4, 'The author implies that conservation efforts were successful because they ______.', NULL, NULL, 'B'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc15', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 5, 'What is the main purpose of the passage?', NULL, NULL, 'B');

INSERT INTO question_options (question_id, option_label, option_text)
VALUES
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'A', 'Call the registrar immediately'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'B', 'Visit the language lab after lunch'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'C', 'Wait until next semester'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'D', 'Cancel the course entirely'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'A', 'A missed flight'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'B', 'A change in class schedule'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'C', 'A library fine'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'D', 'A research deadline'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'A', 'He rarely answers email'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'B', 'He postponed the exam'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'C', 'He expects students to attend office hours'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'D', 'He is new to the department'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc4', 'A', 'The report is almost finished'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc4', 'B', 'The data still needs to be checked'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc4', 'C', 'The meeting has been canceled'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc4', 'D', 'The assistant already submitted everything'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc5', 'A', 'He forgot his student card'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc5', 'B', 'He may not meet the scholarship requirement'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc5', 'C', 'He cannot find the classroom'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc5', 'D', 'He lost his textbook'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc6', 'A', 'English is'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc6', 'B', 'English'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc6', 'C', 'That English'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc6', 'D', 'Being English'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc7', 'A', 'be'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc7', 'B', 'is'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc7', 'C', 'was'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc7', 'D', 'being'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc8', 'A', 'electricity was'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc8', 'B', 'was electricity'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc8', 'C', 'electricity'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc8', 'D', 'did electricity'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc9', 'A', 'are'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc9', 'B', 'were'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc9', 'C', 'is'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc9', 'D', 'have been'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc10', 'A', 'would enjoy'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc10', 'B', 'would have enjoyed'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc10', 'C', 'had enjoyed'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc10', 'D', 'enjoyed'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc11', 'A', 'New farming methods increased production'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc11', 'B', 'Trade routes shifted toward the coast'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc11', 'C', 'A royal family moved there permanently'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc11', 'D', 'The climate became cooler'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc12', 'A', 'limited'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc12', 'B', 'valuable'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc12', 'C', 'hidden'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc12', 'D', 'temporary'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc13', 'A', 'Increased traffic congestion'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc13', 'B', 'Higher demand for housing'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc13', 'C', 'Improved access to education'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc13', 'D', 'A decline in international trade'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc14', 'A', 'received consistent funding'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc14', 'B', 'involved local communities'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc14', 'C', 'reduced tourism completely'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc14', 'D', 'eliminated industrial activity'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc15', 'A', 'To compare two competing scientific theories'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc15', 'B', 'To describe how a policy evolved over time'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc15', 'C', 'To argue against public transportation'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc15', 'D', 'To summarize a fictional narrative');
