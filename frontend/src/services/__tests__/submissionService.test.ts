import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submissionService } from '../submissionService';
import {
  BackendSubmissionResponse,
  FindingResponse,
  RevisionResponse,
  SubmissionDetailResponse,
} from '../../types';
import { ApiError } from '../httpClient';

describe('submissionService and analysis workflow', () => {
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

  describe('createSubmission', () => {
    it('sends POST /submissions with exact payload and returns created submission', async () => {
      const fakeSub: BackendSubmissionResponse = {
        id: 'sub-101',
        brand_id: 'brand-velora',
        workspace_id: 'ws-default',
        title: 'Spring Collection Copy',
        content: 'VELORA announces organic cotton lines.',
        channel: 'Social Media',
        status: 'DRAFT',
        submitted_by: 'user-01',
        created_at: '2026-11-07T10:00:00Z',
        updated_at: '2026-11-07T10:00:00Z',
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: fakeSub,
            message: 'Submission created successfully.',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await submissionService.createSubmission({
        brand_id: 'brand-velora',
        title: 'Spring Collection Copy',
        content: 'VELORA announces organic cotton lines.',
        channel: 'Social Media',
      });

      expect(res).toEqual(fakeSub);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/submissions'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            brand_id: 'brand-velora',
            title: 'Spring Collection Copy',
            content: 'VELORA announces organic cotton lines.',
            channel: 'Social Media',
          }),
        })
      );
    });
  });

  describe('analyzeSubmission', () => {
    it('triggers POST /submissions/:id/analyze and returns detailed findings and scores', async () => {
      const fakeDetail: SubmissionDetailResponse = {
        id: 'sub-101',
        brand_id: 'brand-velora',
        workspace_id: 'ws-default',
        title: 'Spring Collection Copy',
        content: 'VELORA offers cheap fast-fashion apparel.',
        channel: 'Social Media',
        status: 'NEEDS_REVIEW',
        submitted_by: 'user-01',
        compliance_score: 65.0,
        overall_status: 'FLAGGED',
        summary: 'Identified prohibited pricing and fast-fashion terms.',
        corrected_content: 'VELORA offers accessible sustainable couture apparel.',
        findings: [
          {
            id: 'find-01',
            submission_id: 'sub-101',
            ai_finding_id: 'F-001',
            category: 'TERMINOLOGY',
            severity: 'CRITICAL',
            original_text: 'cheap',
            explanation: 'The term "cheap" contradicts the luxury positioning.',
            suggestion: 'accessible luxury',
            violated_guideline: 'Prohibited Terminology',
            evidence: 'Brand terminology bans race-to-the-bottom vocabulary.',
            confidence: 0.95,
            is_resolved: false,
            created_at: '2026-11-07T10:01:00Z',
          },
        ],
        revisions: [],
        approvals: [],
        created_at: '2026-11-07T10:00:00Z',
        updated_at: '2026-11-07T10:01:00Z',
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: fakeDetail,
            message: 'Analysis completed successfully.',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await submissionService.analyzeSubmission('sub-101');
      expect(res).toEqual(fakeDetail);
      expect(res.findings).toHaveLength(1);
      expect(res.findings[0].category).toBe('TERMINOLOGY');
      expect(res.findings[0].severity).toBe('CRITICAL');
      expect(res.findings[0].confidence).toBe(0.95);
      expect(res.corrected_content).toBe('VELORA offers accessible sustainable couture apparel.');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/submissions/sub-101/analyze'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('throws ApiError when backend reports AI Engine failure or timeout', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'AI_SERVICE_ERROR',
              message: 'AI Engine failure [GEMINI_TIMEOUT]: Gemini API call timed out after 30s.',
            },
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      );

      await expect(submissionService.analyzeSubmission('sub-101')).rejects.toThrow(ApiError);
      await expect(submissionService.analyzeSubmission('sub-101')).rejects.toThrow(
        /GEMINI_TIMEOUT/
      );
    });
  });

  describe('getSubmission', () => {
    it('retrieves persisted submission details with revisions and approvals', async () => {
      const fakeDetail: SubmissionDetailResponse = {
        id: 'sub-101',
        brand_id: 'brand-velora',
        workspace_id: 'ws-default',
        title: 'Spring Collection Copy',
        content: 'Sample content',
        status: 'NEEDS_REVIEW',
        submitted_by: 'user-01',
        compliance_score: 90.0,
        overall_status: 'COMPLIANT',
        summary: 'Compliant copy.',
        findings: [],
        revisions: [
          {
            id: 'rev-01',
            submission_id: 'sub-101',
            version: 1,
            content: 'Initial draft',
            changes_summary: 'Initial submission',
            created_by: 'user-01',
            created_at: '2026-11-07T10:00:00Z',
          },
        ],
        approvals: [],
        created_at: '2026-11-07T10:00:00Z',
        updated_at: '2026-11-07T10:02:00Z',
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: fakeDetail,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await submissionService.getSubmission('sub-101');
      expect(res).toEqual(fakeDetail);
      expect(res.revisions).toHaveLength(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/submissions/sub-101'),
        expect.objectContaining({ method: 'GET' })
      );
    });
  });

  describe('createRevision and updateFindingStatus', () => {
    it('creates a formal revision on POST /submissions/:id/revisions', async () => {
      const fakeRev: RevisionResponse = {
        id: 'rev-02',
        submission_id: 'sub-101',
        version: 2,
        content: 'Revised and compliant content.',
        changes_summary: 'Applied AI suggestion',
        created_by: 'user-01',
        created_at: '2026-11-07T10:05:00Z',
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: fakeRev,
            message: 'Revision saved successfully.',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await submissionService.createRevision('sub-101', {
        content: 'Revised and compliant content.',
        changes_summary: 'Applied AI suggestion',
      });

      expect(res).toEqual(fakeRev);
      expect(res.version).toBe(2);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/submissions/sub-101/revisions'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('updates finding resolution state on PATCH /findings/:id', async () => {
      const fakeFinding: FindingResponse = {
        id: 'find-01',
        submission_id: 'sub-101',
        category: 'TERMINOLOGY',
        severity: 'CRITICAL',
        original_text: 'cheap',
        explanation: 'Contradicts brand tone.',
        suggestion: 'accessible luxury',
        is_resolved: true,
        created_at: '2026-11-07T10:00:00Z',
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: fakeFinding,
            message: 'Finding updated.',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await submissionService.updateFindingStatus('find-01', true);
      expect(res.is_resolved).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/findings/find-01'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ is_resolved: true }),
        })
      );
    });

    it('reopens a resolved finding on PATCH /findings/:id with is_resolved: false', async () => {
      const reopenedFinding: FindingResponse = {
        id: 'find-01',
        submission_id: 'sub-101',
        category: 'TERMINOLOGY',
        severity: 'CRITICAL',
        original_text: 'cheap',
        explanation: 'Contradicts brand tone.',
        suggestion: 'accessible luxury',
        is_resolved: false,
        created_at: '2026-11-07T10:00:00Z',
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: reopenedFinding,
            message: 'Finding updated.',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await submissionService.updateFindingStatus('find-01', false);
      expect(res.is_resolved).toBe(false);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/findings/find-01'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ is_resolved: false }),
        })
      );
    });
  });

  describe('approveSubmission and rejectSubmission (Human Editorial Decisions)', () => {
    it('approves submission on POST /submissions/:id/approve with reviewer comments', async () => {
      const fakeApproval = {
        id: 'appr-01',
        submission_id: 'sub-101',
        decision: 'APPROVED',
        reviewer_id: 'rev-user-02',
        comments: 'Certified for publication in Q4 campaign.',
        created_at: '2026-11-07T10:15:00Z',
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: fakeApproval,
            message: 'Submission approved successfully.',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await submissionService.approveSubmission(
        'sub-101',
        'Certified for publication in Q4 campaign.'
      );

      expect(res).toEqual(fakeApproval);
      expect(res.decision).toBe('APPROVED');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/submissions/sub-101/approve'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ comments: 'Certified for publication in Q4 campaign.' }),
        })
      );
    });

    it('approves submission without comments (null comments payload)', async () => {
      const fakeApproval = {
        id: 'appr-02',
        submission_id: 'sub-101',
        decision: 'APPROVED',
        reviewer_id: 'rev-user-02',
        comments: null,
        created_at: '2026-11-07T10:16:00Z',
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: fakeApproval,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await submissionService.approveSubmission('sub-101');
      expect(res.comments).toBeNull();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/submissions/sub-101/approve'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ comments: null }),
        })
      );
    });

    it('rejects submission on POST /submissions/:id/reject with mandatory feedback', async () => {
      const fakeRejection = {
        id: 'appr-03',
        submission_id: 'sub-101',
        decision: 'REJECTED',
        reviewer_id: 'rev-user-02',
        comments: 'Critical prohibited terms remain unresolved.',
        created_at: '2026-11-07T10:20:00Z',
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: fakeRejection,
            message: 'Submission rejected.',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await submissionService.rejectSubmission(
        'sub-101',
        'Critical prohibited terms remain unresolved.'
      );

      expect(res).toEqual(fakeRejection);
      expect(res.decision).toBe('REJECTED');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/submissions/sub-101/reject'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ comments: 'Critical prohibited terms remain unresolved.' }),
        })
      );
    });

    it('throws ApiError when anti-self-approval enforcement returns HTTP 403', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message:
                'Self-approval is prohibited. Another reviewer must approve this submission.',
            },
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      );

      await expect(
        submissionService.approveSubmission('sub-101', 'Trying to approve own work')
      ).rejects.toThrow(ApiError);

      await expect(
        submissionService.approveSubmission('sub-101', 'Trying to approve own work')
      ).rejects.toThrow(/Self-approval is prohibited/);
    });

    it('throws ApiError when editor role attempts to decide on a submission (HTTP 403)', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Only users with REVIEWER or ADMIN role can approve or reject submissions.',
            },
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      );

      await expect(submissionService.rejectSubmission('sub-101')).rejects.toThrow(ApiError);
      await expect(submissionService.rejectSubmission('sub-101')).rejects.toThrow(
        /Only users with REVIEWER or ADMIN role/
      );
    });
  });
});

