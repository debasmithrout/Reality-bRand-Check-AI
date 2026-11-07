import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  dashboardService,
  mapSubmissionStatus,
  formatSubmissionDate,
  formatMetrics,
  formatSubmissions,
} from '../dashboardService';
import {
  BackendSubmissionResponse,
  DashboardSummaryResponse,
} from '../../types';

describe('dashboardService and helper functions', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    vi.restoreAllMocks();
    for (const key in store) delete store[key];

    const mockLocalStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => {
        store[key] = val;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const key in store) delete store[key];
      },
    };
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  describe('mapSubmissionStatus', () => {
    it('maps backend statuses to user-facing strings', () => {
      expect(mapSubmissionStatus('APPROVED')).toBe('Approved');
      expect(mapSubmissionStatus('NEEDS_REVIEW')).toBe('Needs Revision');
      expect(mapSubmissionStatus('REJECTED')).toBe('Rejected');
      expect(mapSubmissionStatus('DRAFT')).toBe('Pending Review');
      expect(mapSubmissionStatus('UNKNOWN')).toBe('Pending Review');
    });
  });

  describe('formatSubmissionDate', () => {
    it('formats valid ISO dates gracefully', () => {
      const nowIso = new Date().toISOString();
      expect(formatSubmissionDate(nowIso)).toContain('Today at');

      const pastIso = '2026-01-15T12:00:00Z';
      const formatted = formatSubmissionDate(pastIso);
      expect(formatted).toContain('2026');
    });

    it('returns raw string on invalid date', () => {
      expect(formatSubmissionDate('invalid-date')).toBe('invalid-date');
    });
  });

  describe('formatMetrics', () => {
    const summary: DashboardSummaryResponse = {
      metrics: {
        average_compliance_score: 91.5,
        total_submissions: 42,
        pending_reviews: 5,
        approved_submissions: 35,
        rejected_submissions: 2,
        total_findings: 18,
        critical_findings: 0,
      },
      recent_submissions: [],
      active_brands_count: 3,
    };

    it('transforms metrics into four dashboard cards', () => {
      const cards = formatMetrics(summary);
      expect(cards).toHaveLength(4);

      // Card 1: Total Submissions
      expect(cards[0].title).toBe('Total Submissions');
      expect(cards[0].value).toBe('42');
      expect(cards[0].change).toBe('35 approved');

      // Card 2: Avg Compliance Score
      expect(cards[1].title).toBe('Avg Compliance Score');
      expect(cards[1].value).toBe('91.5%');
      expect(cards[1].isPositive).toBe(true);

      // Card 3: Violations
      expect(cards[2].title).toBe('Violations & Deviations');
      expect(cards[2].value).toBe('18');
      expect(cards[2].change).toBe('0 critical violations');
      expect(cards[2].isPositive).toBe(true);

      // Card 4: Active Brand Profiles
      expect(cards[3].title).toBe('Active Brand Profiles');
      expect(cards[3].value).toBe('3');
      expect(cards[3].isPositive).toBe(true);
    });
  });

  describe('formatSubmissions', () => {
    const backendSubmissions: BackendSubmissionResponse[] = [
      {
        id: 'sub-001',
        brand_id: 'brand-alpha',
        workspace_id: 'ws-1',
        title: 'Launch Press Release',
        content: 'Content here',
        channel: 'PR Wire',
        status: 'APPROVED',
        submitted_by: 'user-1',
        compliance_score: 95.8,
        created_at: '2026-11-05T10:00:00Z',
        updated_at: '2026-11-05T10:00:00Z',
      },
      {
        id: 'sub-002',
        brand_id: 'brand-beta',
        workspace_id: 'ws-1',
        title: 'Ad Banner Copy',
        content: 'Content here',
        status: 'NEEDS_REVIEW',
        submitted_by: 'user-2',
        compliance_score: null,
        created_at: '2026-11-04T10:00:00Z',
        updated_at: '2026-11-04T10:00:00Z',
      },
    ];

    it('maps brand names and rounds scores', () => {
      const brandsMap = {
        'brand-alpha': 'Alpha Brand Corp',
      };

      const tableItems = formatSubmissions(backendSubmissions, brandsMap);
      expect(tableItems).toHaveLength(2);

      expect(tableItems[0].brand).toBe('Alpha Brand Corp');
      expect(tableItems[0].score).toBe(96);
      expect(tableItems[0].status).toBe('Approved');
      expect(tableItems[0].channel).toBe('PR Wire');

      expect(tableItems[1].brand).toBe('Workspace Brand');
      expect(tableItems[1].score).toBe(0);
      expect(tableItems[1].status).toBe('Needs Revision');
      expect(tableItems[1].channel).toBe('Marketing Copy');
    });
  });

  describe('API calls', () => {
    it('getSummary calls GET /dashboard/summary', async () => {
      const fakeSummary: DashboardSummaryResponse = {
        metrics: {
          average_compliance_score: 88.0,
          total_submissions: 10,
          pending_reviews: 1,
          approved_submissions: 8,
          rejected_submissions: 1,
          total_findings: 4,
          critical_findings: 1,
        },
        recent_submissions: [],
        active_brands_count: 2,
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: fakeSummary,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const summary = await dashboardService.getSummary();
      expect(summary).toEqual(fakeSummary);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/dashboard/summary'),
        expect.any(Object)
      );
    });
  });
});
