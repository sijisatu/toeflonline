/*
  # Add Sample Test Data
  
  ## Overview
  Adds sample test package with sections and questions for testing the TOEFL system
  
  ## Sample Data
  
  ### Test Package
  - TOEFL ITP Prediction - Practice Test 1
  
  ### Sections
  1. Listening (30 questions, 25 minutes)
  2. Structure & Written Expression (40 questions, 25 minutes)
  3. Reading Comprehension (50 questions, 55 minutes)
  
  ### Questions
  - 10 sample questions with multiple choice options
  - Mix of text-based and audio-based questions
  
  ## Notes
  - Uses placeholder URLs for images and audio
  - In production, replace with actual asset URLs from Supabase Storage
*/

DO $$
DECLARE
  v_package_id uuid;
  v_listening_section_id uuid;
  v_structure_section_id uuid;
  v_reading_section_id uuid;
  v_question_id uuid;
BEGIN
  -- Create sample test package
  INSERT INTO test_packages (id, title, description, duration_minutes, is_active)
  VALUES (
    gen_random_uuid(),
    'TOEFL ITP Prediction - Practice Test 1',
    'Complete TOEFL ITP practice test with Listening, Structure, and Reading sections',
    105,
    true
  )
  RETURNING id INTO v_package_id;

  -- Create Listening section
  INSERT INTO test_sections (id, package_id, title, section_order, total_questions, duration_minutes)
  VALUES (
    gen_random_uuid(),
    v_package_id,
    'Section 1: Listening',
    1,
    30,
    25
  )
  RETURNING id INTO v_listening_section_id;

  -- Create Structure section
  INSERT INTO test_sections (id, package_id, title, section_order, total_questions, duration_minutes)
  VALUES (
    gen_random_uuid(),
    v_package_id,
    'Section 2: Structure & Written Expression',
    2,
    40,
    25
  )
  RETURNING id INTO v_structure_section_id;

  -- Create Reading section
  INSERT INTO test_sections (id, package_id, title, section_order, total_questions, duration_minutes)
  VALUES (
    gen_random_uuid(),
    v_package_id,
    'Section 3: Reading',
    3,
    50,
    55
  )
  RETURNING id INTO v_reading_section_id;

  -- Add sample Listening questions (10 questions)
  FOR i IN 1..10 LOOP
    INSERT INTO questions (id, section_id, question_number, question_text, audio_url, audio_duration_seconds, correct_answer)
    VALUES (
      gen_random_uuid(),
      v_listening_section_id,
      i,
      'What does the woman mean?',
      'https://example.com/audio/listening_' || i || '.mp3',
      11,
      CASE WHEN i % 4 = 1 THEN 'A' WHEN i % 4 = 2 THEN 'B' WHEN i % 4 = 3 THEN 'C' ELSE 'D' END
    )
    RETURNING id INTO v_question_id;

    INSERT INTO question_options (question_id, option_label, option_text)
    VALUES 
      (v_question_id, 'A', 'There are many different airline fares available.'),
      (v_question_id, 'B', 'Travel agents are all the same.'),
      (v_question_id, 'C', 'It matters where tickets are issued.'),
      (v_question_id, 'D', 'It makes no difference where the tickets are purchased.');
  END LOOP;

  -- Add sample Structure questions (10 questions)
  FOR i IN 1..10 LOOP
    INSERT INTO questions (id, section_id, question_number, question_text, correct_answer)
    VALUES (
      gen_random_uuid(),
      v_structure_section_id,
      i,
      '______ the most important crop in Hawaii.',
      CASE WHEN i % 4 = 1 THEN 'A' WHEN i % 4 = 2 THEN 'B' WHEN i % 4 = 3 THEN 'C' ELSE 'D' END
    )
    RETURNING id INTO v_question_id;

    INSERT INTO question_options (question_id, option_label, option_text)
    VALUES 
      (v_question_id, 'A', 'Sugar cane'),
      (v_question_id, 'B', 'Sugar cane is'),
      (v_question_id, 'C', 'Sugar cane being'),
      (v_question_id, 'D', 'Sugar cane has been');
  END LOOP;

  -- Add sample Reading questions (10 questions)
  FOR i IN 1..10 LOOP
    INSERT INTO questions (id, section_id, question_number, question_text, correct_answer)
    VALUES (
      gen_random_uuid(),
      v_reading_section_id,
      i,
      'According to the passage, what is the main topic discussed?',
      CASE WHEN i % 4 = 1 THEN 'A' WHEN i % 4 = 2 THEN 'B' WHEN i % 4 = 3 THEN 'C' ELSE 'D' END
    )
    RETURNING id INTO v_question_id;

    INSERT INTO question_options (question_id, option_label, option_text)
    VALUES 
      (v_question_id, 'A', 'The history of environmental protection'),
      (v_question_id, 'B', 'The importance of sustainable development'),
      (v_question_id, 'C', 'The effects of climate change'),
      (v_question_id, 'D', 'The role of international cooperation');
  END LOOP;

END $$;
