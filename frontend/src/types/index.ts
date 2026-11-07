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

// ==========================================
// Backend Brand & Guidelines Models
// ==========================================

export interface BrandResponse {
  id: string;
  workspace_id: string;
  name: string;
  description?: string | null;
  industry?: string | null;
  website?: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GuidelineResponse {
  id: string;
  brand_id: string;
  brand_personality?: any;
  tone_of_voice?: any;
  messaging_rules?: any;
  additional_guidelines?: string | null;
  created_at: string;
  updated_at: string;
}

export type TerminologyType = 'APPROVED' | 'PROHIBITED' | 'PREFERRED';

export interface TerminologyResponse {
  id: string;
  brand_id: string;
  term: string;
  term_type: TerminologyType;
  preferred_replacement?: string | null;
  description?: string | null;
  is_case_sensitive: boolean;
  created_at: string;
  updated_at: string;
}

// Enriched Brand Model used by frontend components
export interface Brand {
  id: string;
  name: string;
  tagline: string;
  voiceTone: string;
  prohibitedTerms: string[];
  mandatoryDisclaimers: string[];
  industry?: string;
  website?: string;
  workspaceId?: string;
  isActive?: boolean;
}

// ==========================================
// Backend Dashboard & Submission Models
// ==========================================

export interface ComplianceMetrics {
  average_compliance_score: number;
  total_submissions: number;
  pending_reviews: number;
  approved_submissions: number;
  rejected_submissions: number;
  total_findings: number;
  critical_findings: number;
}

export interface BackendSubmissionResponse {
  id: string;
  brand_id: string;
  workspace_id: string;
  title: string;
  content: string;
  channel?: string | null;
  status: string; // APPROVED, NEEDS_REVIEW, REJECTED, DRAFT
  submitted_by: string;
  compliance_score?: number | null;
  overall_status?: string | null;
  summary?: string | null;
  corrected_content?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardSummaryResponse {
  metrics: ComplianceMetrics;
  recent_submissions: BackendSubmissionResponse[];
  active_brands_count: number;
}

// ==========================================
// Frontend Component Display Models
// ==========================================

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
  status: 'Approved' | 'Needs Revision' | 'Pending Review' | 'Rejected';
  submittedAt: string;
}

export interface DashboardMetric {
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  description: string;
}
