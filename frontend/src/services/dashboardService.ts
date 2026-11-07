/**
 * Reality bRand Check AI - Dashboard Governance Service
 * Communicates with FastAPI backend /api/v1/dashboard endpoints.
 */

import { httpClient } from './httpClient';
import {
  BackendSubmissionResponse,
  DashboardMetric,
  DashboardSummaryResponse,
  SubmissionItem,
} from '../types';

/**
 * Maps backend submission statuses to user-facing frontend labels.
 */
export function mapSubmissionStatus(
  status: string
): 'Approved' | 'Needs Revision' | 'Pending Review' | 'Rejected' {
  switch (status.toUpperCase()) {
    case 'APPROVED':
      return 'Approved';
    case 'NEEDS_REVIEW':
      return 'Needs Revision';
    case 'REJECTED':
      return 'Rejected';
    case 'DRAFT':
    case 'PENDING':
    default:
      return 'Pending Review';
  }
}

/**
 * Formats ISO timestamp to human-friendly display date.
 */
export function formatSubmissionDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const now = new Date();
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24 && now.getDate() === d.getDate()) {
      return `Today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffHours < 48) {
      return `Yesterday at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Transforms backend compliance metrics into four visual Metric Cards.
 */
export function formatMetrics(summary: DashboardSummaryResponse): DashboardMetric[] {
  const m = summary.metrics;

  return [
    {
      title: 'Total Submissions',
      value: m.total_submissions.toLocaleString(),
      change: `${m.approved_submissions} approved`,
      isPositive: true,
      description: `${m.pending_reviews} pending review, ${m.rejected_submissions} rejected`,
    },
    {
      title: 'Avg Compliance Score',
      value: `${m.average_compliance_score.toFixed(1)}%`,
      change: m.average_compliance_score >= 80 ? 'Target compliance met' : 'Needs attention',
      isPositive: m.average_compliance_score >= 80,
      description: 'Average adherence across scored marketing copy',
    },
    {
      title: 'Violations & Deviations',
      value: m.total_findings.toLocaleString(),
      change:
        m.critical_findings > 0
          ? `${m.critical_findings} critical issues`
          : '0 critical violations',
      isPositive: m.critical_findings === 0,
      description: 'Deviations and terminology issues detected',
    },
    {
      title: 'Active Brand Profiles',
      value: summary.active_brands_count.toString(),
      change:
        summary.active_brands_count > 0 ? 'Configured in workspace' : 'No active brands',
      isPositive: summary.active_brands_count > 0,
      description: 'Brand guideline rules and voice parameters active',
    },
  ];
}

/**
 * Transforms raw backend submissions into frontend table items, resolving brand names.
 */
export function formatSubmissions(
  submissions: BackendSubmissionResponse[],
  brandsMap?: Record<string, string>
): SubmissionItem[] {
  return submissions.map((sub) => {
    const brandName = brandsMap?.[sub.brand_id] || 'Workspace Brand';
    return {
      id: sub.id,
      title: sub.title,
      brand: brandName,
      channel: sub.channel || 'Marketing Copy',
      score: sub.compliance_score != null ? Math.round(sub.compliance_score) : 0,
      status: mapSubmissionStatus(sub.status),
      submittedAt: formatSubmissionDate(sub.created_at),
    };
  });
}

export const dashboardService = {
  /**
   * Fetch complete governance dashboard summary (metrics, recent submissions, brand count).
   */
  async getSummary(): Promise<DashboardSummaryResponse> {
    return httpClient.get<DashboardSummaryResponse>('/dashboard/summary');
  },

  /**
   * Convenience method to fetch and transform dashboard metrics directly into cards.
   */
  async getMetrics(): Promise<DashboardMetric[]> {
    const summary = await this.getSummary();
    return formatMetrics(summary);
  },

  /**
   * Convenience method to fetch and format recent submissions directly.
   */
  async getRecentSubmissions(brandsMap?: Record<string, string>): Promise<SubmissionItem[]> {
    const summary = await this.getSummary();
    return formatSubmissions(summary.recent_submissions || [], brandsMap);
  },
};

