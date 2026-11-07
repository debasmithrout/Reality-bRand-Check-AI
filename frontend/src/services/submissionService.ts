/**
 * Reality bRand Check AI - Submission & Analysis Service
 * Communicates with FastAPI backend /api/v1/submissions and /api/v1/findings endpoints.
 */

import { httpClient } from './httpClient';
import {
  BackendSubmissionResponse,
  FindingResponse,
  RevisionCreatePayload,
  RevisionResponse,
  SubmissionCreatePayload,
  SubmissionDetailResponse,
  SubmissionUpdatePayload,
} from '../types';

export const submissionService = {
  /**
   * Create a new marketing copy submission for brand compliance review.
   */
  async createSubmission(payload: SubmissionCreatePayload): Promise<BackendSubmissionResponse> {
    return httpClient.post<BackendSubmissionResponse>('/submissions', payload);
  },

  /**
   * Trigger AI brand compliance analysis against brand guidelines, terminology, and approved claims.
   */
  async analyzeSubmission(submissionId: string): Promise<SubmissionDetailResponse> {
    return httpClient.post<SubmissionDetailResponse>(`/submissions/${submissionId}/analyze`);
  },

  /**
   * Retrieve submission details, including AI findings, revisions, and approval history.
   */
  async getSubmission(submissionId: string): Promise<SubmissionDetailResponse> {
    return httpClient.get<SubmissionDetailResponse>(`/submissions/${submissionId}`);
  },

  /**
   * List submissions within the user's workspace, optionally filtered by brand or status.
   */
  async listSubmissions(brandId?: string, statusFilter?: string): Promise<BackendSubmissionResponse[]> {
    const params = new URLSearchParams();
    if (brandId) params.append('brand_id', brandId);
    if (statusFilter) params.append('status', statusFilter);
    const query = params.toString() ? `?${params.toString()}` : '';
    return httpClient.get<BackendSubmissionResponse[]>(`/submissions${query}`);
  },

  /**
   * Update submission content or metadata.
   */
  async updateSubmission(
    submissionId: string,
    payload: SubmissionUpdatePayload
  ): Promise<BackendSubmissionResponse> {
    return httpClient.patch<BackendSubmissionResponse>(`/submissions/${submissionId}`, payload);
  },

  /**
   * Record an explicit content revision for a submission.
   */
  async createRevision(
    submissionId: string,
    payload: RevisionCreatePayload
  ): Promise<RevisionResponse> {
    return httpClient.post<RevisionResponse>(`/submissions/${submissionId}/revisions`, payload);
  },

  /**
   * List all revision history for a submission.
   */
  async listRevisions(submissionId: string): Promise<RevisionResponse[]> {
    return httpClient.get<RevisionResponse[]>(`/submissions/${submissionId}/revisions`);
  },

  /**
   * Retrieve all AI brand governance findings for a given submission.
   */
  async getFindings(submissionId: string): Promise<FindingResponse[]> {
    return httpClient.get<FindingResponse[]>(`/submissions/${submissionId}/findings`);
  },

  /**
   * Update finding state (e.g. mark resolved).
   */
  async updateFindingStatus(findingId: string, isResolved: boolean): Promise<FindingResponse> {
    return httpClient.patch<FindingResponse>(`/findings/${findingId}`, { is_resolved: isResolved });
  },
};

