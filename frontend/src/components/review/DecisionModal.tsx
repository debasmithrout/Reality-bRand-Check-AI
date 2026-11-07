import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface DecisionModalProps {
  isOpen: boolean;
  decisionType: 'APPROVE' | 'REJECT';
  submissionTitle: string;
  complianceScore: number | null;
  openFindingsCount: number;
  onClose: () => void;
  onConfirm: (comments: string) => Promise<void>;
}

export const DecisionModal: React.FC<DecisionModalProps> = ({
  isOpen,
  decisionType,
  submissionTitle,
  complianceScore,
  openFindingsCount,
  onClose,
  onConfirm,
}) => {
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isApprove = decisionType === 'APPROVE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!isApprove && !comments.trim()) {
      setError('Please provide a reason for rejecting this marketing copy.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(comments.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to process editorial decision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`p-2.5 rounded-xl ${
              isApprove ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}
          >
            {isApprove ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {isApprove ? 'Approve Marketing Content' : 'Reject Marketing Content'}
            </h3>
            <p className="text-xs text-gray-500 truncate max-w-sm">"{submissionTitle}"</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Governance Context */}
        <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1.5">
          <div className="flex justify-between text-gray-600">
            <span>Compliance Adherence Score:</span>
            <span className="font-bold text-gray-900">
              {complianceScore !== null ? `${Math.round(complianceScore)}%` : 'Not Scored'}
            </span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Remaining Unresolved Findings:</span>
            <span
              className={`font-bold ${
                openFindingsCount > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {openFindingsCount} {openFindingsCount === 1 ? 'issue' : 'issues'}
            </span>
          </div>
          {isApprove && openFindingsCount > 0 && (
            <p className="text-[11px] text-amber-700 pt-1">
              Note: Approving will certify this copy for publication despite {openFindingsCount} open
              finding(s).
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="decision-comments" className="block text-xs font-semibold text-gray-700 mb-1">
              {isApprove
                ? 'Editorial Comments / Sign-off Notes (Optional)'
                : 'Rejection Reason / Guidance for Revision (Required)'}
            </label>
            <textarea
              id="decision-comments"
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={isSubmitting}
              placeholder={
                isApprove
                  ? 'Add any sign-off remarks, publication instructions, or review notes...'
                  : 'Explain policy violations or required adjustments before resubmission...'
              }
              className="w-full border border-gray-300 rounded-lg p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors shadow-xs ${
                isApprove
                  ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300'
                  : 'bg-red-600 hover:bg-red-700 disabled:bg-red-300'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{isApprove ? 'Confirm Approval' : 'Confirm Rejection'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

