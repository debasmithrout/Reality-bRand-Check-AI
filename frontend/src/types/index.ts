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

