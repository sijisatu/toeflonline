type TableName =
  | 'profiles'
  | 'test_packages'
  | 'test_sections'
  | 'questions'
  | 'question_options'
  | 'test_sessions'
  | 'user_answers'
  | 'certificates'
  | 'proctoring_logs';

export type User = {
  id: string;
  email: string;
};

type AuthSession = {
  access_token: string;
  user: User;
};

type AuthUser = User & {
  password: string;
};

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'participant';
  avatar_url?: string;
  created_at: string;
};

export type TestPackage = {
  id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
};

export type TestSection = {
  id: string;
  package_id: string;
  title: string;
  section_order: number;
  total_questions: number;
  duration_minutes: number;
  created_at: string;
};

export type Question = {
  id: string;
  section_id: string;
  question_number: number;
  question_text: string;
  question_image_url?: string;
  audio_url?: string;
  audio_duration_seconds?: number;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  created_at: string;
};

export type QuestionOption = {
  id: string;
  question_id: string;
  option_label: 'A' | 'B' | 'C' | 'D';
  option_text: string;
  created_at: string;
};

export type TestSession = {
  id: string;
  user_id: string;
  package_id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  completed_at?: string;
  time_remaining_seconds: number;
  current_section_id?: string;
  current_question_number: number;
  proctoring_enabled: boolean;
};

export type UserAnswer = {
  id: string;
  session_id: string;
  question_id: string;
  selected_answer?: 'A' | 'B' | 'C' | 'D';
  is_flagged: boolean;
  time_spent_seconds: number;
  answered_at: string;
};

export type Certificate = {
  id: string;
  session_id: string;
  user_id: string;
  package_id: string;
  listening_score: number;
  structure_score: number;
  reading_score: number;
  total_score: number;
  generated_at: string;
};

export type ProctoringLog = {
  id: string;
  session_id: string;
  event_type:
    | 'camera_blocked'
    | 'microphone_blocked'
    | 'tab_switch'
    | 'face_not_detected'
    | 'multiple_faces'
    | 'session_started'
    | 'session_ended';
  event_data?: Record<string, unknown>;
  timestamp: string;
};

type DBState = {
  auth_users: AuthUser[];
  profiles: Profile[];
  test_packages: TestPackage[];
  test_sections: TestSection[];
  questions: Question[];
  question_options: QuestionOption[];
  test_sessions: TestSession[];
  user_answers: UserAnswer[];
  certificates: Certificate[];
  proctoring_logs: ProctoringLog[];
};

type QueryResult<T> = {
  data: T | null;
  error: Error | null;
  count?: number | null;
};

type AuthResponse<T> = {
  data: T;
  error: Error | null;
};

type Filter =
  | { type: 'eq'; field: string; value: unknown }
  | { type: 'in'; field: string; values: unknown[] }
  | { type: 'gte'; field: string; value: number };

const DB_STORAGE_KEY = 'toefl-local-db';
const SESSION_STORAGE_KEY = 'toefl-local-session';
const AUTH_EVENT_NAME = 'toefl-local-auth';
const LOCAL_ACCESS_TOKEN = 'local-demo-token';

const authListeners = new Set<(event: string, session: AuthSession | null) => void>();

function now() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

function createSeedState(): DBState {
  const adminUserId = 'local-admin-user';
  const participantUserId = 'local-participant-user';
  const packageId = 'pkg-toefl-itp-1';
  const listeningSectionId = 'section-listening-1';
  const structureSectionId = 'section-structure-1';
  const readingSectionId = 'section-reading-1';
  const createdAt = now();

  const authUsers: AuthUser[] = [
    {
      id: adminUserId,
      email: 'admin@demo-toefl.local',
      password: 'Admin123!',
    },
    {
      id: participantUserId,
      email: 'participant@demo-toefl.local',
      password: 'Participant123!',
    },
  ];

  const profiles: Profile[] = [
    {
      id: adminUserId,
      email: 'admin@demo-toefl.local',
      full_name: 'Demo Admin',
      role: 'admin',
      created_at: createdAt,
    },
    {
      id: participantUserId,
      email: 'participant@demo-toefl.local',
      full_name: 'Demo Participant',
      role: 'participant',
      created_at: createdAt,
    },
  ];

  const testPackages: TestPackage[] = [
    {
      id: packageId,
      title: 'TOEFL ITP Prediction - Practice Test 1',
      description: 'Complete TOEFL ITP practice test with Listening, Structure, and Reading sections.',
      duration_minutes: 105,
      is_active: true,
      created_by: adminUserId,
      created_at: createdAt,
    },
  ];

  const testSections: TestSection[] = [
    {
      id: listeningSectionId,
      package_id: packageId,
      title: 'Section 1: Listening',
      section_order: 1,
      total_questions: 5,
      duration_minutes: 25,
      created_at: createdAt,
    },
    {
      id: structureSectionId,
      package_id: packageId,
      title: 'Section 2: Structure & Written Expression',
      section_order: 2,
      total_questions: 5,
      duration_minutes: 25,
      created_at: createdAt,
    },
    {
      id: readingSectionId,
      package_id: packageId,
      title: 'Section 3: Reading Comprehension',
      section_order: 3,
      total_questions: 5,
      duration_minutes: 55,
      created_at: createdAt,
    },
  ];

  const questions: Question[] = [];
  const options: QuestionOption[] = [];

  const questionSeeds = [
    {
      sectionId: listeningSectionId,
      title: 'What does the man suggest the woman do next?',
      answers: [
        'Call the registrar immediately',
        'Visit the language lab after lunch',
        'Wait until next semester',
        'Cancel the course entirely',
      ],
      correct: 'B' as const,
    },
    {
      sectionId: listeningSectionId,
      title: 'What are the speakers mainly discussing?',
      answers: [
        'A missed flight',
        'A change in class schedule',
        'A library fine',
        'A research deadline',
      ],
      correct: 'B' as const,
    },
    {
      sectionId: listeningSectionId,
      title: 'What can be inferred about the professor?',
      answers: [
        'He rarely answers email',
        'He postponed the exam',
        'He expects students to attend office hours',
        'He is new to the department',
      ],
      correct: 'C' as const,
    },
    {
      sectionId: listeningSectionId,
      title: 'What does the woman mean?',
      answers: [
        'The report is almost finished',
        'The data still needs to be checked',
        'The meeting has been canceled',
        'The assistant already submitted everything',
      ],
      correct: 'B' as const,
    },
    {
      sectionId: listeningSectionId,
      title: 'Why is the student concerned?',
      answers: [
        'He forgot his student card',
        'He may not meet the scholarship requirement',
        'He cannot find the classroom',
        'He lost his textbook',
      ],
      correct: 'B' as const,
    },
    {
      sectionId: structureSectionId,
      title: '______ one of the most widely spoken languages in the world.',
      answers: ['English is', 'English', 'That English', 'Being English'],
      correct: 'A' as const,
    },
    {
      sectionId: structureSectionId,
      title: 'The committee recommended that the proposal ______ revised.',
      answers: ['be', 'is', 'was', 'being'],
      correct: 'A' as const,
    },
    {
      sectionId: structureSectionId,
      title: 'Not until the 19th century ______ understood.',
      answers: ['electricity was', 'was electricity', 'electricity', 'did electricity'],
      correct: 'B' as const,
    },
    {
      sectionId: structureSectionId,
      title: 'The book, together with several articles, ______ on the top shelf.',
      answers: ['are', 'were', 'is', 'have been'],
      correct: 'C' as const,
    },
    {
      sectionId: structureSectionId,
      title: 'If the weather had improved, we ______ the field trip.',
      answers: ['would enjoy', 'would have enjoyed', 'had enjoyed', 'enjoyed'],
      correct: 'B' as const,
    },
    {
      sectionId: readingSectionId,
      title: 'According to the passage, why did the city expand rapidly?',
      answers: [
        'New farming methods increased production',
        'Trade routes shifted toward the coast',
        'A royal family moved there permanently',
        'The climate became cooler',
      ],
      correct: 'B' as const,
    },
    {
      sectionId: readingSectionId,
      title: 'The word "scarce" in the passage is closest in meaning to ______.',
      answers: ['limited', 'valuable', 'hidden', 'temporary'],
      correct: 'A' as const,
    },
    {
      sectionId: readingSectionId,
      title: 'Which of the following is NOT mentioned as an effect of urbanization?',
      answers: [
        'Increased traffic congestion',
        'Higher demand for housing',
        'Improved access to education',
        'A decline in international trade',
      ],
      correct: 'D' as const,
    },
    {
      sectionId: readingSectionId,
      title: 'The author implies that conservation efforts were successful because they ______.',
      answers: [
        'received consistent funding',
        'involved local communities',
        'reduced tourism completely',
        'eliminated industrial activity',
      ],
      correct: 'B' as const,
    },
    {
      sectionId: readingSectionId,
      title: 'What is the main purpose of the passage?',
      answers: [
        'To compare two competing scientific theories',
        'To describe how a policy evolved over time',
        'To argue against public transportation',
        'To summarize a fictional narrative',
      ],
      correct: 'B' as const,
    },
  ];

  questionSeeds.forEach((seed, index) => {
    const questionId = `question-${index + 1}`;
    const sectionQuestions = questions.filter((question) => question.section_id === seed.sectionId).length + 1;

    questions.push({
      id: questionId,
      section_id: seed.sectionId,
      question_number: sectionQuestions,
      question_text: seed.title,
      audio_url:
        seed.sectionId === listeningSectionId
          ? `https://example.com/audio/listening-${sectionQuestions}.mp3`
          : undefined,
      audio_duration_seconds: seed.sectionId === listeningSectionId ? 12 : undefined,
      correct_answer: seed.correct,
      created_at: createdAt,
    });

    seed.answers.forEach((answer, answerIndex) => {
      const label = ['A', 'B', 'C', 'D'][answerIndex] as 'A' | 'B' | 'C' | 'D';
      options.push({
        id: `${questionId}-${label}`,
        question_id: questionId,
        option_label: label,
        option_text: answer,
        created_at: createdAt,
      });
    });
  });

  return {
    auth_users: authUsers,
    profiles,
    test_packages: testPackages,
    test_sections: testSections,
    questions,
    question_options: options,
    test_sessions: [],
    user_answers: [],
    certificates: [],
    proctoring_logs: [],
  };
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readState(): DBState {
  if (!canUseStorage()) {
    return createSeedState();
  }

  const existing = window.localStorage.getItem(DB_STORAGE_KEY);
  if (!existing) {
    const seeded = createSeedState();
    writeState(seeded);
    return seeded;
  }

  return JSON.parse(existing) as DBState;
}

function writeState(state: DBState) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(state));
}

function getCurrentSession(): AuthSession | null {
  if (!canUseStorage()) return null;
  const userId = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!userId) return null;

  const state = readState();
  const authUser = state.auth_users.find((user) => user.id === userId);
  if (!authUser) return null;

  return {
    access_token: LOCAL_ACCESS_TOKEN,
    user: {
      id: authUser.id,
      email: authUser.email,
    },
  };
}

function setCurrentSession(userId: string | null) {
  if (!canUseStorage()) return;

  if (userId) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, userId);
  } else {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

function emitAuthEvent(event: string, session: AuthSession | null) {
  authListeners.forEach((listener) => listener(event, session));
  if (canUseStorage()) {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME));
  }
}

function applyFilters<T extends Record<string, unknown>>(rows: T[], filters: Filter[]) {
  return rows.filter((row) =>
    filters.every((filter) => {
      if (filter.type === 'eq') return row[filter.field] === filter.value;
      if (filter.type === 'in') return filter.values.includes(row[filter.field]);
      if (filter.type === 'gte') return Number(row[filter.field]) >= filter.value;
      return true;
    })
  );
}

function selectColumns<T extends Record<string, unknown>>(rows: T[], columns: string) {
  if (columns === '*') return rows;

  const keys = columns.split(',').map((column) => column.trim()).filter(Boolean);
  return rows.map((row) => {
    const next: Record<string, unknown> = {};
    keys.forEach((key) => {
      next[key] = row[key];
    });
    return next;
  });
}

function sortRows<T extends Record<string, unknown>>(rows: T[], field: string, ascending: boolean) {
  return [...rows].sort((left, right) => {
    const a = left[field];
    const b = right[field];

    if (a === b) return 0;
    if (a === undefined) return 1;
    if (b === undefined) return -1;

    return ascending ? (a > b ? 1 : -1) : a > b ? -1 : 1;
  });
}

function removeCascade(state: DBState, table: TableName, rows: Array<Record<string, unknown>>) {
  if (table === 'test_packages') {
    const packageIds = rows.map((row) => String(row.id));
    const sectionIds = state.test_sections
      .filter((section) => packageIds.includes(section.package_id))
      .map((section) => section.id);
    const questionIds = state.questions
      .filter((question) => sectionIds.includes(question.section_id))
      .map((question) => question.id);
    const sessionIds = state.test_sessions
      .filter((session) => packageIds.includes(session.package_id))
      .map((session) => session.id);

    state.test_sections = state.test_sections.filter((section) => !packageIds.includes(section.package_id));
    state.questions = state.questions.filter((question) => !sectionIds.includes(question.section_id));
    state.question_options = state.question_options.filter((option) => !questionIds.includes(option.question_id));
    state.test_sessions = state.test_sessions.filter((session) => !packageIds.includes(session.package_id));
    state.user_answers = state.user_answers.filter((answer) => !sessionIds.includes(answer.session_id));
    state.certificates = state.certificates.filter((certificate) => !packageIds.includes(certificate.package_id));
    state.proctoring_logs = state.proctoring_logs.filter((log) => !sessionIds.includes(log.session_id));
  }

  if (table === 'test_sections') {
    const sectionIds = rows.map((row) => String(row.id));
    const questionIds = state.questions
      .filter((question) => sectionIds.includes(question.section_id))
      .map((question) => question.id);

    state.questions = state.questions.filter((question) => !sectionIds.includes(question.section_id));
    state.question_options = state.question_options.filter((option) => !questionIds.includes(option.question_id));
    state.user_answers = state.user_answers.filter((answer) => !questionIds.includes(answer.question_id));
  }

  if (table === 'questions') {
    const questionIds = rows.map((row) => String(row.id));
    state.question_options = state.question_options.filter((option) => !questionIds.includes(option.question_id));
    state.user_answers = state.user_answers.filter((answer) => !questionIds.includes(answer.question_id));
  }
}

class QueryBuilder {
  private filters: Filter[] = [];
  private orderByField: string | null = null;
  private orderAscending = true;
  private limitValue: number | null = null;
  private selectColumnsValue = '*';
  private singleMode: 'single' | 'maybeSingle' | null = null;
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private payload: Record<string, unknown> | Array<Record<string, unknown>> | null = null;
  private countMode: 'exact' | null = null;
  private headMode = false;
  private onConflictValue: string | null = null;
  private returnRows = false;

  constructor(private readonly table: TableName) {}

  select(columns = '*', options?: { count?: 'exact'; head?: boolean }) {
    this.selectColumnsValue = columns;
    this.countMode = options?.count || null;
    this.headMode = options?.head || false;
    this.returnRows = true;
    return this;
  }

  insert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  upsert(payload: Record<string, unknown> | Array<Record<string, unknown>>, options?: { onConflict?: string }) {
    this.action = 'upsert';
    this.payload = payload;
    this.onConflictValue = options?.onConflict || null;
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters.push({ type: 'eq', field, value });
    return this;
  }

  in(field: string, values: unknown[]) {
    this.filters.push({ type: 'in', field, values });
    return this;
  }

  gte(field: string, value: number) {
    this.filters.push({ type: 'gte', field, value });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderByField = field;
    this.orderAscending = options?.ascending ?? true;
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  single() {
    this.singleMode = 'single';
    return this;
  }

  maybeSingle() {
    this.singleMode = 'maybeSingle';
    return this;
  }

  then<TResult1 = QueryResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<QueryResult<unknown>> {
    try {
      const state = readState();
      const tableRows = state[this.table] as Array<Record<string, unknown>>;

      if (this.action === 'select') {
        const filtered = this.finalizeRows(applyFilters(tableRows, this.filters));
        const selected = selectColumns(filtered, this.selectColumnsValue);
        const count = this.countMode === 'exact' ? filtered.length : null;

        if (this.headMode) {
          return { data: null, error: null, count };
        }

        return this.finalizeSingleMode(selected, count);
      }

      if (this.action === 'insert') {
        const payloadRows = this.normalizePayload();
        const inserted = payloadRows.map((row) => this.withDefaults(row));
        (state[this.table] as Array<Record<string, unknown>>).push(...inserted);
        writeState(state);

        if (!this.returnRows) return { data: null, error: null };
        const selected = selectColumns(inserted, this.selectColumnsValue);
        return this.finalizeSingleMode(selected, null);
      }

      if (this.action === 'update') {
        const updatePayload = this.payload as Record<string, unknown>;
        const filtered = applyFilters(tableRows, this.filters);
        const updated = filtered.map((row) => Object.assign(row, updatePayload));
        writeState(state);

        if (!this.returnRows) return { data: null, error: null };
        const selected = selectColumns(updated, this.selectColumnsValue);
        return this.finalizeSingleMode(selected, null);
      }

      if (this.action === 'delete') {
        const filtered = applyFilters(tableRows, this.filters);
        removeCascade(state, this.table, filtered);
        state[this.table] = tableRows.filter((row) => !filtered.includes(row)) as never;
        writeState(state);
        return { data: null, error: null };
      }

      if (this.action === 'upsert') {
        const payloadRows = this.normalizePayload().map((row) => this.withDefaults(row));
        const conflictFields = (this.onConflictValue || 'id')
          .split(',')
          .map((field) => field.trim())
          .filter(Boolean);

        const nextRows = state[this.table] as Array<Record<string, unknown>>;
        const affected: Array<Record<string, unknown>> = [];

        payloadRows.forEach((payloadRow) => {
          const existing = nextRows.find((row) =>
            conflictFields.every((field) => row[field] === payloadRow[field])
          );

          if (existing) {
            Object.assign(existing, payloadRow);
            affected.push(existing);
          } else {
            nextRows.push(payloadRow);
            affected.push(payloadRow);
          }
        });

        writeState(state);

        if (!this.returnRows) return { data: null, error: null };
        const selected = selectColumns(affected, this.selectColumnsValue);
        return this.finalizeSingleMode(selected, null);
      }

      return { data: null, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown local DB error'),
      };
    }
  }

  private normalizePayload() {
    if (!this.payload) return [];
    return Array.isArray(this.payload) ? this.payload : [this.payload];
  }

  private withDefaults(row: Record<string, unknown>) {
    const nextRow = { ...row };
    if (!nextRow.id) {
      nextRow.id = createId(this.table);
    }

    if (!nextRow.created_at && tableHasCreatedAt(this.table)) {
      nextRow.created_at = now();
    }

    if (this.table === 'user_answers' && !nextRow.answered_at) {
      nextRow.answered_at = now();
    }

    if (this.table === 'certificates' && !nextRow.generated_at) {
      nextRow.generated_at = now();
    }

    if (this.table === 'proctoring_logs' && !nextRow.timestamp) {
      nextRow.timestamp = now();
    }

    return nextRow;
  }

  private finalizeRows(rows: Array<Record<string, unknown>>) {
    let nextRows = rows;

    if (this.orderByField) {
      nextRows = sortRows(nextRows, this.orderByField, this.orderAscending);
    }

    if (this.limitValue !== null) {
      nextRows = nextRows.slice(0, this.limitValue);
    }

    return nextRows;
  }

  private finalizeSingleMode(rows: Array<Record<string, unknown>>, count: number | null) {
    if (this.singleMode === 'single') {
      if (rows.length !== 1) {
        return {
          data: null,
          error: new Error('Expected exactly one row'),
          count,
        };
      }

      return { data: rows[0], error: null, count };
    }

    if (this.singleMode === 'maybeSingle') {
      return {
        data: rows[0] || null,
        error: null,
        count,
      };
    }

    return { data: rows, error: null, count };
  }
}

function tableHasCreatedAt(table: TableName) {
  return (
    table === 'profiles' ||
    table === 'test_packages' ||
    table === 'test_sections' ||
    table === 'questions' ||
    table === 'question_options'
  );
}

export async function calculateScore(sessionId: string) {
  const state = readState();
  const session = state.test_sessions.find((item) => item.id === sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  const sections = state.test_sections
    .filter((section) => section.package_id === session.package_id)
    .sort((a, b) => a.section_order - b.section_order);

  const scores = {
    listening: 0,
    structure: 0,
    reading: 0,
  };

  sections.forEach((section) => {
    const questions = state.questions.filter((question) => question.section_id === section.id);
    const correctCount = questions.reduce((total, question) => {
      const answer = state.user_answers.find(
        (item) => item.session_id === sessionId && item.question_id === question.id
      );
      return total + (answer?.selected_answer === question.correct_answer ? 1 : 0);
    }, 0);

    const percentage = questions.length ? correctCount / questions.length : 0;
    const scaledScore = Math.round(31 + percentage * 37);

    if (section.title.toLowerCase().includes('listening')) scores.listening = scaledScore;
    else if (section.title.toLowerCase().includes('structure')) scores.structure = scaledScore;
    else scores.reading = scaledScore;
  });

  const totalScore = Math.round(((scores.listening + scores.structure + scores.reading) / 3) * 10);

  const existing = state.certificates.find((certificate) => certificate.session_id === sessionId);
  const certificate: Certificate = {
    id: existing?.id || createId('certificate'),
    session_id: sessionId,
    user_id: session.user_id,
    package_id: session.package_id,
    listening_score: scores.listening,
    structure_score: scores.structure,
    reading_score: scores.reading,
    total_score: totalScore,
    generated_at: now(),
  };

  if (existing) {
    Object.assign(existing, certificate);
  } else {
    state.certificates.push(certificate);
  }

  writeState(state);
  return certificate;
}

export function resetLocalDemoData() {
  writeState(createSeedState());
  setCurrentSession(null);
  emitAuthEvent('signed_out', null);
}

export const supabase: any = {
  auth: {
    async getSession(): Promise<AuthResponse<{ session: AuthSession | null }>> {
      return {
        data: { session: getCurrentSession() },
        error: null,
      };
    },
    onAuthStateChange(callback: (event: string, session: AuthSession | null) => void) {
      authListeners.add(callback);

      return {
        data: {
          subscription: {
            unsubscribe() {
              authListeners.delete(callback);
            },
          },
        },
      };
    },
    async signInWithPassword({
      email,
      password,
    }: {
      email: string;
      password: string;
    }): Promise<AuthResponse<{ user: User | null }>> {
      const state = readState();
      const authUser = state.auth_users.find((user) => user.email === email);

      if (!authUser || authUser.password !== password) {
        return {
          data: { user: null },
          error: new Error('Invalid login credentials'),
        };
      }

      const session = {
        access_token: LOCAL_ACCESS_TOKEN,
        user: {
          id: authUser.id,
          email: authUser.email,
        },
      };

      setCurrentSession(authUser.id);
      emitAuthEvent('signed_in', session);

      return {
        data: { user: session.user },
        error: null,
      };
    },
    async signUp({
      email,
      password,
    }: {
      email: string;
      password: string;
    }): Promise<AuthResponse<{ user: User | null }>> {
      const state = readState();
      const existing = state.auth_users.find((user) => user.email === email);

      if (existing) {
        return {
          data: { user: null },
          error: new Error('User already registered'),
        };
      }

      const nextUser: AuthUser = {
        id: createId('user'),
        email,
        password,
      };

      state.auth_users.push(nextUser);
      writeState(state);

      return {
        data: {
          user: {
            id: nextUser.id,
            email: nextUser.email,
          },
        },
        error: null,
      };
    },
    async signOut(): Promise<AuthResponse<Record<string, never>>> {
      setCurrentSession(null);
      emitAuthEvent('signed_out', null);
      return {
        data: {},
        error: null,
      };
    },
  },
  from(table: TableName) {
    return new QueryBuilder(table);
  },
};
