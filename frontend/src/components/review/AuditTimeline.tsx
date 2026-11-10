import React from 'react';
import { SubmissionDetailResponse } from '../../types';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  XCircle,
  History,
  ShieldCheck,
  Clock,
  UserCheck,
} from 'lucide-react';
import { formatRelativeTime } from '../../utils/formatters';

interface AuditTimelineProps {
  submission: SubmissionDetailResponse;
  currentUserId?: string;
}

interface TimelineEvent {
  id: string;
  type: 'CREATED' | 'ANALYSIS' | 'REVISION' | 'DECISION';
  timestamp: string;
  title: string;
  actor: string;
  summary: string;
  badge?: {
    text: string;
    className: string;
  };
  details?: React.ReactNode;
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({
  submission,
  currentUserId,
}) => {
  const events: TimelineEvent[] = [];

  // 1. Initial Submission Creation
  if (submission.created_at) {
    const isMe = currentUserId && submission.submitted_by === currentUserId;
    events.push({
      id: `created-${submission.id}`,
      type: 'CREATED',
      timestamp: submission.created_at,
      title: 'Marketing Copy Submitted',
      actor: isMe ? 'You (Author)' : `Author (${submission.submitted_by.slice(0, 8)}...)`,
      summary: `Created initial submission draft for channel "${submission.channel || 'Standard'}".`,
      badge: {
        text: 'v1 Initial Draft',
        className: 'bg-gray-100 text-gray-700 border-gray-200',
      },
    });
  }

  // 2. Revisions (versions > 1)
  if (submission.revisions && submission.revisions.length > 0) {
    submission.revisions.forEach((rev) => {
      if (rev.version > 1) {
        const isMe = currentUserId && rev.created_by === currentUserId;
        events.push({
          id: `rev-${rev.id}`,
          type: 'REVISION',
          timestamp: rev.created_at,
          title: `Revision v${rev.version} Created`,
          actor: isMe ? 'You (Editor)' : `Editor (${rev.created_by.slice(0, 8)}...)`,
          summary: rev.changes_summary || `Updated copy content version ${rev.version}.`,
          badge: {
            text: `v${rev.version}`,
            className: 'bg-blue-50 text-blue-700 border-blue-200',
          },
        });
      }
    });
  }

  // 3. AI Compliance Analysis
  if (submission.compliance_score !== null && submission.compliance_score !== undefined) {
    const findingsCount = submission.findings ? submission.findings.length : 0;
    const resolvedCount = submission.findings
      ? submission.findings.filter((f) => f.is_resolved).length
      : 0;

    const isHeuristic = submission.summary?.includes('[Heuristic Fallback Engine]');
    const engineLabel = isHeuristic ? 'Heuristic Engine' : 'Gemini 3.5 Flash';

    let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (submission.overall_status === 'NON_COMPLIANT') {
      badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
    } else if (submission.overall_status === 'FLAGGED') {
      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
    }

    events.push({
      id: `analysis-${submission.id}`,
      type: 'ANALYSIS',
      timestamp: submission.updated_at || submission.created_at,
      title: 'AI Brand Compliance Audit',
      actor: `${engineLabel} (Automated)`,
      summary: `Evaluated tone, prohibited terminology, and claims. Adherence score: ${Math.round(
        submission.compliance_score
      )}%. Identified ${findingsCount} finding(s) (${resolvedCount} resolved).`,
      badge: {
        text: `${Math.round(submission.compliance_score)}% Score`,
        className: badgeClass,
      },
    });
  }

  // 4. Human Review & Approvals / Rejections
  if (submission.approvals && submission.approvals.length > 0) {
    submission.approvals.forEach((appr) => {
      const isApproved = appr.decision === 'APPROVED';
      const isMe = currentUserId && appr.reviewer_id === currentUserId;
      events.push({
        id: `decision-${appr.id}`,
        type: 'DECISION',
        timestamp: appr.created_at,
        title: isApproved ? 'Editorial Approval Sign-Off' : 'Editorial Rejection',
        actor: isMe ? 'You (Reviewer)' : `Reviewer (${appr.reviewer_id.slice(0, 8)}...)`,
        summary: appr.comments
          ? `Reviewer comments: "${appr.comments}"`
          : isApproved
          ? 'Certified compliant for production marketing publication.'
          : 'Rejected copy due to brand policy non-compliance.',
        badge: {
          text: isApproved ? 'Approved' : 'Rejected',
          className: isApproved
            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
            : 'bg-rose-100 text-rose-800 border-rose-300',
        },
      });
    });
  }

  // Sort events chronologically (earliest first for narrative timeline)
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (events.length === 0) {
    return null;
  }

  const getEventIcon = (type: TimelineEvent['type'], title: string) => {
    switch (type) {
      case 'CREATED':
        return <FileText className="h-4 w-4 text-gray-500" />;
      case 'ANALYSIS':
        return <Sparkles className="h-4 w-4 text-indigo-600" />;
      case 'REVISION':
        return <History className="h-4 w-4 text-blue-600" />;
      case 'DECISION':
        return title.includes('Approval') ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <XCircle className="h-4 w-4 text-rose-600" />
        );
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventBorderColor = (type: TimelineEvent['type'], title: string) => {
    switch (type) {
      case 'ANALYSIS':
        return 'border-indigo-400 bg-indigo-50';
      case 'REVISION':
        return 'border-blue-400 bg-blue-50';
      case 'DECISION':
        return title.includes('Approval')
          ? 'border-emerald-500 bg-emerald-50'
          : 'border-rose-500 bg-rose-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-indigo-600" />
          <h4 className="text-sm font-bold text-gray-900">Governance & Audit Trail</h4>
        </div>
        <span className="text-xs text-gray-400 font-mono">
          {events.length} {events.length === 1 ? 'event' : 'events'} recorded
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-200">
        {events.map((evt) => (
          <div key={evt.id} className="relative flex items-start gap-3">
            {/* Dot Node */}
            <div
              className={`absolute -left-[23px] top-1 h-6 w-6 rounded-full border-2 flex items-center justify-center ${getEventBorderColor(
                evt.type,
                evt.title
              )}`}
            >
              {getEventIcon(evt.type, evt.title)}
            </div>

            {/* Event Content */}
            <div className="flex-1 bg-gray-50/70 rounded-lg p-3 border border-gray-100 text-xs space-y-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{evt.title}</span>
                  {evt.badge && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${evt.badge.className}`}
                    >
                      {evt.badge.text}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-gray-400 font-mono">
                  {formatRelativeTime(evt.timestamp)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <UserCheck className="h-3 w-3 text-gray-400" />
                <span>{evt.actor}</span>
                <span>•</span>
                <span>{new Date(evt.timestamp).toLocaleString()}</span>
              </div>

              <p className="text-gray-700 leading-relaxed pt-0.5">{evt.summary}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

