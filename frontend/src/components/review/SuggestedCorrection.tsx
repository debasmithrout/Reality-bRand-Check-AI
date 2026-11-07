import React, { useState, useEffect } from 'react';
import { Copy, Check, Edit3, ArrowUpRight, Save, RotateCcw } from 'lucide-react';

interface SuggestedCorrectionProps {
  correction: string;
  onApplyToInput?: (text: string) => void;
  onSaveRevision?: (text: string) => Promise<void>;
}

export const SuggestedCorrection: React.FC<SuggestedCorrectionProps> = ({
  correction,
  onApplyToInput,
  onSaveRevision,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(correction);
  const [isSavingRevision, setIsSavingRevision] = useState(false);
  const [revisionSaved, setRevisionSaved] = useState(false);

  useEffect(() => {
    setEditedText(correction);
    setIsEditing(false);
    setRevisionSaved(false);
  }, [correction]);

  const handleCopy = () => {
    navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (onApplyToInput) {
      onApplyToInput(editedText);
    }
  };

  const handleSave = async () => {
    if (!onSaveRevision || isSavingRevision) return;
    setIsSavingRevision(true);
    try {
      await onSaveRevision(editedText);
      setRevisionSaved(true);
      setTimeout(() => setRevisionSaved(false), 3000);
    } finally {
      setIsSavingRevision(false);
    }
  };

  return (
    <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
          Suggested Brand-Compliant Revision
        </h4>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Edit Mode */}
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-50 px-2.5 py-1 rounded-md transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>{isEditing ? 'View Mode' : 'Edit Suggestion'}</span>
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-50 px-2.5 py-1 rounded-md transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Apply to Draft Button */}
          {onApplyToInput && (
            <button
              type="button"
              onClick={handleApply}
              title="Copy this suggested text into the main draft editor"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-md transition-colors shadow-xs"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Use in Draft</span>
            </button>
          )}

          {/* Save Formal Revision Button */}
          {onSaveRevision && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSavingRevision}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-900 bg-emerald-100 border border-emerald-300 hover:bg-emerald-200 px-3 py-1 rounded-md transition-colors disabled:opacity-50"
            >
              {revisionSaved ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Revision Saved!</span>
                </>
              ) : isSavingRevision ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save as Revision</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            rows={5}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full text-sm text-emerald-950 font-normal leading-relaxed bg-white p-3 rounded-lg border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <p className="text-[11px] text-emerald-700">
            You can modify the suggested copy above before copying, applying, or saving it as a formal revision.
          </p>
        </div>
      ) : (
        <p className="text-sm text-emerald-950 font-normal leading-relaxed bg-white p-3 rounded-lg border border-emerald-100 whitespace-pre-wrap">
          {editedText}
        </p>
      )}

      <p className="text-[11px] text-emerald-800/80 mt-2">
        * Suggested rewrite incorporates authorized terminology, tone adjustments, and mandatory legal disclaimers. Human editorial review is required prior to publication.
      </p>
    </div>
  );
};
