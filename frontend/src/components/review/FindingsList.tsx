import React from 'react';
import { FindingResponse } from '../../types';
import { getSeverityBadgeColor } from '../../utils/formatters';
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

interface FindingsListProps {
  findings: FindingResponse[];
  onToggleResolve?: (findingId: string, currentResolved: boolean) => void;
}

export const FindingsList: React.FC<FindingsListProps> = ({ findings, onToggleResolve }) => {
  if (findings.length === 0) {
    return (
      <div className="p-8 text-center bg-emerald-50/50 border border-emerald-200 rounded-xl">
        <ShieldCheck className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
        <p className="text-sm font-semibold text-emerald-900">
          No brand compliance violations detected.
        </p>
        <p className="text-xs text-emerald-700/80 mt-1">
          Draft copy aligns with active tone rules, approved facts, and terminology.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {findings.map((f) => {
        const origText = f.original_text || f.matched_text || '';
        const isCritical = f.severity?.toUpperCase() === 'CRITICAL';

        return (
          <div
            key={f.id}
            className={`p-4 rounded-xl border transition-all ${
              f.is_resolved
                ? 'bg-gray-50/60 border-gray-200 opacity-75'
                : isCritical
                ? 'bg-red-50/20 border-red-200 shadow-xs'
                : 'bg-white border-gray-200 shadow-xs hover:border-gray-300'
            }`}
          >
            {/* Top row: Title / Category / Severity */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                {isCritical ? (
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                )}
                <span className="font-semibold text-gray-900 text-sm">
                  {f.category.replace(/_/g, ' ')}
                </span>
                {f.ai_finding_id && (
                  <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    {f.ai_finding_id}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Confidence badge (only when supplied by backend) */}
                {f.confidence !== null && f.confidence !== undefined && (
                  <span className="text-[11px] font-mono font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {Math.round(f.confidence * 100)}% confidence
                  </span>
                )}

                {/* Severity pill */}
                <span
                  className={`text-[11px] uppercase font-bold px-2 py-0.5 rounded border ${getSeverityBadgeColor(
                    f.severity
                  )}`}
                >
                  {f.severity}
                </span>

                {/* Resolve Toggle Button */}
                {onToggleResolve && (
                  <button
                    type="button"
                    onClick={() => onToggleResolve(f.id, f.is_resolved)}
                    className={`ml-1 text-[11px] font-medium px-2 py-0.5 rounded border flex items-center gap-1 transition-colors ${
                      f.is_resolved
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{f.is_resolved ? 'Resolved' : 'Mark Resolved'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Explanation */}
            <p className="text-xs text-gray-700 mb-2 leading-relaxed">{f.explanation}</p>

            {/* Violated Rule Reference (if supplied) */}
            {(f.violated_guideline || f.rule_reference) && (
              <p className="text-[11px] text-gray-500 mb-2.5">
                <span className="font-semibold text-gray-600">Guideline Rule:</span>{' '}
                {f.violated_guideline || f.rule_reference}
              </p>
            )}

            {/* Evidence quote (if supplied) */}
            {f.evidence && (
              <div className="mb-2.5 p-2 bg-blue-50/60 border border-blue-100 rounded text-[11px] text-blue-900 leading-normal">
                <span className="font-semibold text-blue-800">Verification Evidence:</span> {f.evidence}
              </div>
            )}

            {/* Diff Comparison: Original Text vs Suggestion */}
            {(origText || f.suggestion) && (
              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200/70 text-xs flex flex-col sm:flex-row sm:items-center gap-2">
                {origText && (
                  <div className="flex items-center gap-1.5 text-rose-700 font-mono line-through bg-rose-50 px-2 py-1 rounded break-all">
                    "{origText}"
                  </div>
                )}
                {origText && f.suggestion && (
                  <ArrowRight className="h-3.5 w-3.5 text-gray-400 hidden sm:block shrink-0" />
                )}
                {f.suggestion && (
                  <div className="flex items-center gap-1.5 text-emerald-800 font-medium bg-emerald-50 px-2 py-1 rounded break-all">
                    "{f.suggestion}"
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
