/*
  # Seed Demo Users

  Creates one admin and one participant account for local/demo testing.

  Credentials:
  - admin@demo-toefl.local / Admin123!
  - participant@demo-toefl.local / Participant123!
*/

DO $$
DECLARE
  admin_user_id uuid := '11111111-1111-1111-1111-111111111111';
  participant_user_id uuid := '22222222-2222-2222-2222-222222222222';
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = admin_user_id
  ) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_user_id,
      'authenticated',
      'authenticated',
      'admin@demo-toefl.local',
      crypt('Admin123!', gen_salt('bf')),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Demo Admin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      created_at,
      updated_at,
      last_sign_in_at
    )
    VALUES (
      gen_random_uuid(),
      admin_user_id,
      jsonb_build_object(
        'sub', admin_user_id::text,
        'email', 'admin@demo-toefl.local'
      ),
      'email',
      'admin@demo-toefl.local',
      now(),
      now(),
      now()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = participant_user_id
  ) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      participant_user_id,
      'authenticated',
      'authenticated',
      'participant@demo-toefl.local',
      crypt('Participant123!', gen_salt('bf')),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Demo Participant"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      created_at,
      updated_at,
      last_sign_in_at
    )
    VALUES (
      gen_random_uuid(),
      participant_user_id,
      jsonb_build_object(
        'sub', participant_user_id::text,
        'email', 'participant@demo-toefl.local'
      ),
      'email',
      'participant@demo-toefl.local',
      now(),
      now(),
      now()
    );
  END IF;

  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    admin_user_id,
    'Demo Admin',
    'admin@demo-toefl.local',
    'admin'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role;

  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    participant_user_id,
    'Demo Participant',
    'participant@demo-toefl.local',
    'participant'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role;
END $$;
