/**
 * Reality bRand Check AI - Mock Data Storage
 *
 * PHASE 4B CLEANUP NOTE:
 * - Brand management and Dashboard metrics/submissions have been successfully integrated
 *   with the live FastAPI backend (/api/v1/brands, /api/v1/dashboard/summary).
 * - DEMO_BRANDS, DEMO_METRICS, and DEMO_SUBMISSIONS have been decommissioned and removed.
 *
 * REMAINING MOCK FUNCTIONALITY:
 * - SAMPLE_ANALYSIS_PRESETS is temporarily retained for the Content Review AI analysis preview,
 *   which is scheduled to be connected to live Gemini AI submissions in Phase 4C.
 */

import { ContentReviewResult } from '../types';

export const SAMPLE_ANALYSIS_PRESETS: Record<string, ContentReviewResult> = {
  default: {
    id: 'REV-SAMPLE-01',
    brandId: 'b-default',
    content: 'Nexus Cloud offers cheap enterprise servers with guaranteed 100% uptime for all operations.',
    overallScore: 68,
    status: 'needs_revision',
    findings: [
      {
        id: 'f-1',
        type: 'terminology',
        severity: 'high',
        title: 'Prohibited Term Detected',
        originalText: 'cheap',
        suggestedText: 'cost-effective / competitive',
        explanation: 'The word "cheap" conflicts with the premium enterprise brand identity.',
      },
      {
        id: 'f-2',
        type: 'claim',
        severity: 'high',
        title: 'Unsubstantiated High-Risk Claim',
        originalText: 'guaranteed 100% uptime',
        suggestedText: 'industry-leading 99.99% uptime SLA',
        explanation: 'Absolute uptime guarantees expose the brand to regulatory and contract liability.',
      },
      {
        id: 'f-3',
        type: 'tone',
        severity: 'medium',
        title: 'Voice & Tone Alignment',
        originalText: 'for all operations',
        suggestedText: 'engineered to scale mission-critical workloads seamlessly',
        explanation: 'Tone should be authoritative and enterprise-grade.',
      },
    ],
    suggestedCorrection:
      'Nexus Cloud offers cost-effective enterprise infrastructure with an industry-leading 99.99% uptime SLA, engineered to scale mission-critical workloads seamlessly. Subject to enterprise SLA terms.',
    createdAt: 'Just now (Demo Analysis)',
  },
};
