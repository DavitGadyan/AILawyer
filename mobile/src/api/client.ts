import { API_URL } from './config';
import { getItem, KEYS } from './storage';
import type {
  AuthResponse,
  CaseProfile,
  ChatSession,
  ChatSessionDetail,
  ChecklistItem,
  ComplianceItem,
  Consultation,
  ForumCategory,
  ForumPost,
  ForumThread,
  ForumThreadDetail,
  Health,
  Lawyer,
  LawyerMatch,
  SuggestedTopic,
  TaxProfile,
  User,
} from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await getItem(KEYS.token);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? await authHeader() : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.detail === 'string') detail = body.detail;
      else if (Array.isArray(body?.detail)) detail = body.detail[0]?.msg ?? detail;
    } catch {
      /* non-JSON error body — keep the generic message */
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== '' && v !== null,
  );
  return entries.length
    ? `?${entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')}`
    : '';
};

export const api = {
  health: () => request<Health>('/health', { auth: false }),

  // ----------------------------- auth ----------------------------------- //
  register: (body: { email: string; password: string; full_name?: string; locale?: string }) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: false,
    }),

  login: (body: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: false,
    }),

  me: () => request<User>('/auth/me'),

  updateMe: (body: { full_name?: string; locale?: string; accepted_disclaimer?: boolean }) =>
    request<User>('/auth/me', { method: 'PATCH', body: JSON.stringify(body) }),

  // ---------------------------- content --------------------------------- //
  topics: (practice: string, jurisdiction: string, locale: string) =>
    request<SuggestedTopic[]>(`/topics${qs({ practice, jurisdiction, locale })}`, {
      auth: false,
    }),

  // ---------------------------- lawyers --------------------------------- //
  lawyers: (params: {
    q?: string;
    practice?: string;
    jurisdiction?: string;
    specialty?: string;
    language?: string;
    max_rate?: number;
    limit?: number;
  }) => request<Lawyer[]>(`/lawyers${qs(params)}`, { auth: false }),

  lawyer: (id: number) => request<Lawyer>(`/lawyers/${id}`, { auth: false }),

  matchLawyers: (body: {
    profile_id?: number;
    practice?: string;
    jurisdiction?: string;
    specialties?: string[];
    locale?: string;
    limit?: number;
  }) => request<LawyerMatch[]>('/lawyers/match', { method: 'POST', body: JSON.stringify(body) }),

  requestConsultation: (body: {
    lawyer_id: number;
    channel: string;
    session_id?: number;
    message?: string;
  }) => request<Consultation>('/consultations', { method: 'POST', body: JSON.stringify(body) }),

  // ------------------------------ chat ---------------------------------- //
  sessions: () => request<ChatSession[]>('/chat/sessions'),
  session: (id: number) => request<ChatSessionDetail>(`/chat/sessions/${id}`),
  deleteSession: (id: number) => request<void>(`/chat/sessions/${id}`, { method: 'DELETE' }),

  // ----------------------------- triage --------------------------------- //
  triage: (body: {
    description: string;
    jurisdiction: string;
    locale: string;
    session_id?: number;
  }) => request<CaseProfile>('/triage', { method: 'POST', body: JSON.stringify(body) }),

  caseProfile: (id: number) => request<CaseProfile>(`/triage/${id}`),
  caseProfileBySession: (sessionId: number) =>
    request<CaseProfile>(`/triage/by-session/${sessionId}`),
  toggleChecklistItem: (itemId: number, isDone: boolean) =>
    request<ChecklistItem>(`/triage/checklist/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_done: isDone }),
    }),

  // ----------------------- tax & structuring ---------------------------- //
  analyseTax: (body: {
    description: string;
    jurisdiction: string;
    locale: string;
    session_id?: number;
  }) => request<TaxProfile>('/tax/analyse', { method: 'POST', body: JSON.stringify(body) }),

  taxProfile: (id: number) => request<TaxProfile>(`/tax/${id}`),
  taxProfileBySession: (sessionId: number) =>
    request<TaxProfile>(`/tax/by-session/${sessionId}`),
  toggleComplianceItem: (itemId: number, isDone: boolean) =>
    request<ComplianceItem>(`/tax/compliance/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_done: isDone }),
    }),

  // ------------------------------ forum --------------------------------- //
  forumCategories: (locale: string) =>
    request<ForumCategory[]>(`/forum/categories${qs({ locale })}`, { auth: false }),

  forumThreads: (params: { category_id?: number; q?: string; limit?: number }) =>
    request<ForumThread[]>(`/forum/threads${qs(params)}`, { auth: false }),

  forumThread: (id: number) =>
    request<ForumThreadDetail>(`/forum/threads/${id}`, { auth: false }),

  createThread: (body: { category_id: number; title: string; body: string }) =>
    request<ForumThread>('/forum/threads', { method: 'POST', body: JSON.stringify(body) }),

  createPost: (threadId: number, body: string) =>
    request<ForumPost>(`/forum/threads/${threadId}/posts`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  reportContent: (body: { thread_id?: number; post_id?: number; reason?: string }) =>
    request<{ status: string }>('/forum/reports', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export { API_URL };
