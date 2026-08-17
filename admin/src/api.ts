const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';
const TOKEN_KEY = 'ailawyer.admin.token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.detail === 'string') detail = body.detail;
    } catch {
      /* non-JSON body */
    }
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface Lawyer {
  id: number;
  name: string;
  headline: string;
  avatar_url: string;
  bio: string;
  city: string;
  country: string;
  jurisdiction: string;
  bar_admission: string;
  practices: string[];
  specialties: string[];
  languages: string[];
  hourly_rate: number;
  currency: string;
  rating: number;
  reviews_count: number;
  years_experience: number;
  cases_count: number;
  email: string;
  whatsapp: string;
  offers_free_consult: boolean;
  firm: { id: number; name: string } | null;
}

export interface Topic {
  id: number;
  practice: string;
  jurisdiction: string;
  icon: string;
  title_en: string;
  title_es: string;
  subtitle_en: string;
  subtitle_es: string;
  prompt_en: string;
  prompt_es: string;
  sort_order: number;
  is_published: boolean;
}

export interface Report {
  id: number;
  thread_id: number | null;
  post_id: number | null;
  reason: string;
  status: string;
  created_at: string;
  excerpt: string;
}

export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  locale: string;
  accepted_disclaimer: boolean;
}

export interface Stats {
  users: number;
  lawyers: number;
  chat_sessions: number;
  messages: number;
  case_profiles: number;
  tax_profiles: number;
  consultations: number;
  threads: number;
  posts: number;
  open_reports: number;
  top_jurisdictions: { jurisdiction: string; sessions: number }[];
}

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string; user: AdminUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<AdminUser>('/auth/me'),

  stats: () => request<Stats>('/admin/stats'),

  lawyers: () => request<Lawyer[]>('/admin/lawyers'),
  createLawyer: (body: unknown) =>
    request<Lawyer>('/admin/lawyers', { method: 'POST', body: JSON.stringify(body) }),
  updateLawyer: (id: number, body: unknown) =>
    request<Lawyer>(`/admin/lawyers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteLawyer: (id: number) =>
    request<void>(`/admin/lawyers/${id}`, { method: 'DELETE' }),

  topics: () => request<Topic[]>('/admin/topics'),
  createTopic: (body: unknown) =>
    request<{ id: number }>('/admin/topics', { method: 'POST', body: JSON.stringify(body) }),
  updateTopic: (id: number, body: unknown) =>
    request<{ id: number }>(`/admin/topics/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTopic: (id: number) => request<void>(`/admin/topics/${id}`, { method: 'DELETE' }),

  reports: (status = 'open') => request<Report[]>(`/admin/reports?status=${status}`),
  resolveReport: (id: number, hide: boolean) =>
    request<unknown>(`/admin/reports/${id}/resolve?hide_content=${hide}`, { method: 'POST' }),

  users: () => request<AdminUser[]>('/admin/users'),
  setRole: (id: number, role: string) =>
    request<AdminUser>(`/admin/users/${id}/role?role=${role}`, { method: 'POST' }),
};
