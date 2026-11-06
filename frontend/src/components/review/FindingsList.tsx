import React from 'react';
import { ReviewFinding } from '../../types';
import { getSeverityBadgeColor } from '../../utils/formatters';
import { AlertCircle, ArrowRight } from 'lucide-react';

interface FindingsListProps {
  findings: ReviewFinding[];
}

export const FindingsList: React.FC<FindingsListProps> = ({ findings }) => {
  if (findings.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-gray-500 bg-gray-50 rounded-lg">
        No compliance findings or warnings detected.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {findings.map((f) => (
        <div
          key={f.id}
          className="p-4 rounded-lg border border-gray-200 bg-white shadow-xs hover:border-gray-300 transition-colors"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="font-semibold text-gray-900 text-sm">{f.title}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                {f.type}
              </span>
              <span
                className={`text-[11px] uppercase font-bold px-2 py-0.5 rounded border ${getSeverityBadgeColor(
                  f.severity
                )}`}
              >
                {f.severity} risk
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-600 mb-3">{f.explanation}</p>

          <div className="bg-gray-50 p-2.5 rounded-md border border-gray-100 text-xs flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-1.5 text-rose-700 font-mono line-through bg-rose-50 px-2 py-1 rounded">
              "{f.originalText}"
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-gray-400 hidden sm:block shrink-0" />
            <div className="flex items-center gap-1.5 text-emerald-800 font-medium bg-emerald-50 px-2 py-1 rounded">
              "{f.suggestedText}"
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

