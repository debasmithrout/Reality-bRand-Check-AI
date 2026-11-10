import React, { useState } from 'react';
import { RevisionResponse } from '../../types';
import { History, ArrowUpRight, Plus, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface RevisionHistoryProps {
  revisions: RevisionResponse[];
  currentContent: string;
  onLoadRevision: (content: string) => void;
  onSaveRevision: (changesSummary: string) => Promise<void>;
}

export const RevisionHistory: React.FC<RevisionHistoryProps> = ({
  revisions,
  currentContent,
  onLoadRevision,
  onSaveRevision,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [changesSummary, setChangesSummary] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);

  const nextVersion = revisions.length > 0 ? Math.max(...revisions.map((r) => r.version)) + 1 : 1;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    try {
      await onSaveRevision(changesSummary.trim() || `Revision v${nextVersion}`);
      setChangesSummary('');
      setShowSaveForm(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-blue-600" />
          <h4 className="text-sm font-bold text-gray-900">
            Revision History ({revisions.length})
          </h4>
        </div>

        <button
          type="button"
          onClick={() => setShowSaveForm(!showSaveForm)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Save Current Draft as v{nextVersion}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>New revision version saved to database successfully.</span>
        </div>
      )}

      {/* Save New Revision Inline Form */}
      {showSaveForm && (
        <form onSubmit={handleSave} className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
          <div>
            <label htmlFor="rev-summary" className="block text-xs font-semibold text-gray-700 mb-1">
              Changes Summary for Version {nextVersion}
            </label>
            <input
              id="rev-summary"
              type="text"
              value={changesSummary}
              onChange={(e) => setChangesSummary(e.target.value)}
              placeholder="e.g. Applied AI feedback and updated disclaimers"
              className="w-full border border-gray-300 rounded-md p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowSaveForm(false)}
              className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : `Save Version ${nextVersion}`}
            </button>
          </div>
        </form>
      )}

      {/* Revisions List */}
      <div className="divide-y divide-gray-100">
        {revisions.map((rev) => {
          const isPreviewing = previewVersionId === rev.id;

          return (
            <div key={rev.id} className="py-2.5 first:pt-0 last:pb-0 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded font-mono">
                    v{rev.version}
                  </span>
                  <span className="text-gray-700 ml-2 font-medium">
                    {rev.changes_summary || 'No summary recorded'}
                  </span>
                  <span className="text-gray-400 ml-2">
                    • {new Date(rev.created_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewVersionId(isPreviewing ? null : rev.id)}
                    className="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-900 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded hover:bg-gray-100"
                  >
                    <span>{isPreviewing ? 'Hide Copy' : 'View Copy'}</span>
                    {isPreviewing ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => onLoadRevision(rev.content)}
                    title="Load this revision's content into draft editor"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded hover:bg-blue-100"
                  >
                    <ArrowUpRight className="h-3 w-3" />
                    <span>Load in Editor</span>
                  </button>
                </div>
              </div>

              {/* Revision Content Preview & Comparison */}
              {isPreviewing && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold uppercase tracking-wider">
                    <span>Archived Content (Version {rev.version})</span>
                    <span>{rev.content.length} characters</span>
                  </div>
                  <p className="bg-white p-2.5 rounded border border-gray-200 font-mono text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {rev.content}
                  </p>
                  {currentContent !== rev.content && (
                    <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                      Draft in editor differs from this archived revision. Click "Load in Editor" to revert to this version.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
