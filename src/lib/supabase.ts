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
    | 'session_ended'
    | 'fullscreen_exit'
    | 'heartbeat'
    | 'snapshot_uploaded';
  event_data?: Record<string, unknown>;
  timestamp: string;
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

function resolveApiOrigin() {
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:4000';
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname || '127.0.0.1';
  return `${protocol}//${hostname}:4000`;
}

export const API_ORIGIN = resolveApiOrigin();
const API_BASE_URL = `${API_ORIGIN}/api`;
const SESSION_STORAGE_KEY = 'toefl-api-session';
const AUTH_EVENT_NAME = 'toefl-api-auth';

export function resolveMediaUrl(url?: string | null) {
  if (!url) return '';

  if (url.startsWith('/')) {
    return `${API_ORIGIN}${url}`;
  }

  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith('/api/media/')) {
      return `${API_ORIGIN}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return url;
  } catch {
    return url;
  }
}

const authListeners = new Set<(event: string, session: AuthSession | null) => void>();

function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function setStoredSession(session: AuthSession | null) {
  if (typeof window === 'undefined') return;

  if (session) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

function emitAuthEvent(event: string, session: AuthSession | null) {
  authListeners.forEach((listener) => listener(event, session));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME));
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {});

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'Request failed');
  }

  return data as T;
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
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<QueryResult<unknown>> {
    try {
      const body = {
        filters: this.filters,
        orderByField: this.orderByField,
        orderAscending: this.orderAscending,
        limitValue: this.limitValue,
        columns: this.selectColumnsValue,
        singleMode: this.singleMode,
        payload: this.payload,
        countMode: this.countMode,
        headMode: this.headMode,
        onConflictValue: this.onConflictValue,
        returnRows: this.returnRows,
      };

      const data = await apiFetch<QueryResult<unknown>>(`/db/${this.table}/${this.action}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      return {
        ...data,
        error: data.error ? new Error((data.error as Error).message || 'Request failed') : null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown request error'),
      };
    }
  }
}

export async function calculateScore(sessionId: string) {
  const result = await apiFetch<{ certificate: Certificate }>(`/reports/calculate/${sessionId}`, {
    method: 'POST',
  });

  return result.certificate;
}


export async function uploadMedia(input: {
  kind: 'question-image' | 'question-audio';
  fileName: string;
  mimeType: string;
  contentBase64: string;
}) {
  const result = await apiFetch<{ url: string; fileName: string; mimeType: string; size: number }>('/media/upload', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return {
    ...result,
    url: result.url,
  };
}
export function resetLocalDemoData() {
  setStoredSession(null);
  emitAuthEvent('signed_out', null);
}

export const supabase: any = {
  auth: {
    async getSession(): Promise<AuthResponse<{ session: AuthSession | null }>> {
      return {
        data: { session: getStoredSession() },
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
      try {
        const data = await apiFetch<AuthSession>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });

        setStoredSession(data);
        emitAuthEvent('signed_in', data);

        return {
          data: { user: data.user },
          error: null,
        };
      } catch (error) {
        return {
          data: { user: null },
          error: error instanceof Error ? error : new Error('Login failed'),
        };
      }
    },
    async signUp({
      email,
      password,
      fullName,
    }: {
      email: string;
      password: string;
      fullName: string;
    }): Promise<AuthResponse<{ user: User | null; session?: AuthSession }>> {
      try {
        const data = await apiFetch<{ user: User; session: AuthSession }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, fullName }),
        });

        setStoredSession(data.session);
        emitAuthEvent('signed_in', data.session);

        return {
          data,
          error: null,
        };
      } catch (error) {
        return {
          data: { user: null },
          error: error instanceof Error ? error : new Error('Sign up failed'),
        };
      }
    },
    async signOut(): Promise<AuthResponse<Record<string, never>>> {
      setStoredSession(null);
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




