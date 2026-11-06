import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface SuggestedCorrectionProps {
  correction: string;
}

export const SuggestedCorrection: React.FC<SuggestedCorrectionProps> = ({ correction }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(correction);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
          Suggested Brand-Compliant Revision
        </h4>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-50 px-2.5 py-1 rounded-md transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Revised Text</span>
            </>
          )}
        </button>
      </div>
      <p className="text-sm text-emerald-950 font-normal leading-relaxed bg-white p-3 rounded-lg border border-emerald-100">
        {correction}
      </p>
      <p className="text-[11px] text-emerald-800/80 mt-2">
        * Suggested rewrite incorporates authorized terminology, tone adjustments, and mandatory legal disclaimers.
      </p>
    </div>
  );
};

