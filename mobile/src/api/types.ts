export type Jurisdiction = 'US' | 'EU' | 'ES' | 'UK';
export type Practice = 'immigration' | 'tax';
export type Locale = 'en' | 'es';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'client' | 'lawyer' | 'admin';
  locale: string;
  accepted_disclaimer: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Firm {
  id: number;
  name: string;
  city: string;
  country: string;
  website: string;
}

export interface Lawyer {
  id: number;
  name: string;
  headline: string;
  avatar_url: string;
  bio: string;
  city: string;
  country: string;
  jurisdiction: Jurisdiction;
  bar_admission: string;
  practices: Practice[];
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
  firm: Firm | null;
}

export interface LawyerMatch extends Lawyer {
  match_score: number;
  match_reasons: string[];
}

export interface SuggestedTopic {
  id: number;
  practice: Practice;
  jurisdiction: string;
  icon: string;
  title: string;
  subtitle: string;
  prompt: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  lawyer_ids: number[];
  created_at: string;
}

export interface ChatSession {
  id: number;
  title: string;
  practice: Practice;
  jurisdiction: Jurisdiction;
  locale: string;
  created_at: string;
  updated_at: string;
  has_profile: boolean;
}

export interface ChatSessionDetail extends ChatSession {
  messages: ChatMessage[];
}

export interface Route {
  name: string;
  fit_score: number;
  why: string;
  typical_timeline: string;
  est_cost: string;
}

export interface ChecklistItem {
  id: number;
  name: string;
  why: string;
  mandatory: boolean;
  is_done: boolean;
}

export interface CaseProfile {
  id: number;
  session_id: number;
  nationality: string;
  current_country: string;
  target_jurisdiction: Jurisdiction;
  current_status: string;
  goal: string;
  urgency: 'low' | 'medium' | 'high';
  dependents: number;
  summary: string;
  key_facts: string[];
  recommended_routes: Route[];
  suggested_specialties: string[];
  red_flags: string[];
  checklist: ChecklistItem[];
}

// --------------------------- tax & structuring ---------------------------- //
export type EntityRole = 'holding' | 'trading' | 'ip' | 'finance' | 'dormant';
export type Severity = 'low' | 'medium' | 'high';

export interface StructureEntity {
  id: number;
  name: string;
  entity_type: string;
  jurisdiction: Jurisdiction;
  role: EntityRole;
  /** Empty string marks the top of the group. */
  owned_by: string;
  ownership_pct: number;
  rationale: string;
  tax_treatment: string;
  setup_cost: string;
  annual_cost: string;
}

export interface TaxRisk {
  id: number;
  title: string;
  category: string;
  severity: Severity;
  explanation: string;
  mitigation: string;
}

export interface ComplianceItem {
  id: number;
  name: string;
  jurisdiction: Jurisdiction;
  frequency: string;
  deadline: string;
  why: string;
  mandatory: boolean;
  is_done: boolean;
}

export interface Alternative {
  name: string;
  why: string;
  tradeoff: string;
}

export interface TaxProfile {
  id: number;
  session_id: number;
  residence_country: string;
  primary_jurisdiction: Jurisdiction;
  business_activity: string;
  revenue_flow: string;
  goal: string;
  complexity: Severity;
  summary: string;
  structure_rationale: string;
  estimated_setup_cost: string;
  estimated_annual_cost: string;
  current_entities: string[];
  key_facts: string[];
  alternatives: Alternative[];
  suggested_specialties: string[];
  red_flags: string[];
  entities: StructureEntity[];
  risks: TaxRisk[];
  compliance: ComplianceItem[];
}

export interface ForumCategory {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  thread_count: number;
}

export interface Author {
  id: number;
  full_name: string;
  role: string;
}

export interface ForumPost {
  id: number;
  body: string;
  created_at: string;
  author: Author;
}

export interface ForumThread {
  id: number;
  category_id: number;
  title: string;
  body: string;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  author: Author;
  reply_count: number;
}

export interface ForumThreadDetail extends ForumThread {
  posts: ForumPost[];
}

export interface Consultation {
  id: number;
  lawyer_id: number;
  channel: string;
  status: string;
  whatsapp_url: string;
  mailto_url: string;
}

export interface Health {
  status: string;
  ai_enabled: boolean;
  chat_model: string;
}
