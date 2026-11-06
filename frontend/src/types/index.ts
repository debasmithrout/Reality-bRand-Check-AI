export type UserRole = 'ADMIN' | 'EDITOR' | 'REVIEWER';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  workspace_id: string;
  avatar_url?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  role?: UserRole;
  workspace_id?: string;
}

export interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  type?: string;
}

export interface Brand {
  id: string;
  name: string;
  tagline: string;
  voiceTone: string;
  prohibitedTerms: string[];
  mandatoryDisclaimers: string[];
}

export interface ReviewFinding {
  id: string;
  type: 'terminology' | 'tone' | 'fact' | 'claim';
  severity: 'high' | 'medium' | 'low';
  title: string;
  originalText: string;
  suggestedText: string;
  explanation: string;
}

export interface ContentReviewResult {
  id: string;
  brandId: string;
  content: string;
  overallScore: number;
  status: 'passed' | 'needs_revision' | 'rejected';
  findings: ReviewFinding[];
  suggestedCorrection: string;
  createdAt: string;
}

export interface SubmissionItem {
  id: string;
  title: string;
  brand: string;
  channel: string;
  score: number;
  status: 'Approved' | 'Needs Revision' | 'Pending Review';
  submittedAt: string;
}

export interface DashboardMetric {
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  description: string;
}
