import React, { useState, useEffect, useCallback } from 'react';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { FindingsList } from '../components/review/FindingsList';
import { SuggestedCorrection } from '../components/review/SuggestedCorrection';
import { brandService, extractToneOfVoice } from '../services/brandService';
import { submissionService } from '../services/submissionService';
import {
  BrandResponse,
  GuidelineResponse,
  SubmissionDetailResponse,
  TerminologyResponse,
} from '../types';
import { getScoreBadgeColor } from '../utils/formatters';
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  BookOpen,
  Ban,
  CheckCircle2,
  Cpu,
  History,
} from 'lucide-react';
import { ApiError } from '../services/httpClient';

export const ContentReviewPage: React.FC = () => {
  const [brands, setBrands] = useState<BrandResponse[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [guidelines, setGuidelines] = useState<GuidelineResponse | null>(null);
  const [terminology, setTerminology] = useState<TerminologyResponse[]>([]);
  const [loadingBrands, setLoadingBrands] = useState<boolean>(true);
  const [brandError, setBrandError] = useState<string | null>(null);

  // Form Fields
  const [campaignTitle, setCampaignTitle] = useState<string>('Q4 Campaign Copy Review');
  const [channel, setChannel] = useState<string>('Social Media');
  const [inputText, setInputText] = useState<string>('');

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStage, setAnalysisStage] = useState<string>('');
  const [currentSubmission, setCurrentSubmission] = useState<SubmissionDetailResponse | null>(null);
  const [pendingSubmissionId, setPendingSubmissionId] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load active brands for workspace
  const fetchBrands = useCallback(async () => {
    setLoadingBrands(true);
    setBrandError(null);
    try {
      const data = await brandService.getBrands(true);
      setBrands(data || []);
      if (data && data.length > 0) {
        setSelectedBrandId(data[0].id);
      } else {
        setSelectedBrandId('');
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setBrandError(err.message);
      } else {
        setBrandError('Failed to load workspace brand profiles.');
      }
    } finally {
      setLoadingBrands(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  // When selectedBrandId changes, fetch its guidelines and terminology
  useEffect(() => {
    if (!selectedBrandId) {
      setGuidelines(null);
      setTerminology([]);
      return;
    }

    let isCancelled = false;

    const fetchBrandDetails = async () => {
      try {
        const [g, t] = await Promise.all([
          brandService.getGuidelines(selectedBrandId).catch(() => null),
          brandService.getTerminology(selectedBrandId).catch(() => []),
        ]);
        if (!isCancelled) {
          setGuidelines(g);
          setTerminology(t || []);
        }
      } catch {
        if (!isCancelled) {
          setGuidelines(null);
          setTerminology([]);
        }
      }
    };

    fetchBrandDetails();

    return () => {
      isCancelled = true;
    };
  }, [selectedBrandId]);

  // Reset pendingSubmissionId when user changes content or brand to avoid stale reuse
  const handleContentChange = (newText: string) => {
    setInputText(newText);
    setValidationError(null);
    if (pendingSubmissionId && currentSubmission?.content !== newText) {
      setPendingSubmissionId(null);
    }
  };

  const handleBrandChange = (newBrandId: string) => {
    setSelectedBrandId(newBrandId);
    setValidationError(null);
    setPendingSubmissionId(null);
  };

  // Run the full 3-step real submission analysis workflow
  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Prevent duplicate clicks
    if (isAnalyzing) return;

    // Validation
    if (!selectedBrandId) {
      setValidationError('Please select an active brand profile before initiating analysis.');
      return;
    }

    const trimmedContent = inputText.trim();
    if (!trimmedContent) {
      setValidationError('Please provide marketing copy text to analyze.');
      return;
    }

    setValidationError(null);
    setAnalysisError(null);
    setIsAnalyzing(true);

    let submissionIdToAnalyze = pendingSubmissionId;

    try {
      // Step 1: Create submission if not already created
      if (!submissionIdToAnalyze) {
        setAnalysisStage('Creating persisted submission record...');
        const createdSub = await submissionService.createSubmission({
          brand_id: selectedBrandId,
          title: campaignTitle.trim() || 'Marketing Copy Review',
          content: trimmedContent,
          channel: channel || 'Social Media',
        });
        submissionIdToAnalyze = createdSub.id;
        setPendingSubmissionId(createdSub.id);
      }

      // Step 2: Trigger AI analysis
      setAnalysisStage('Running brand compliance analysis...');
      await submissionService.analyzeSubmission(submissionIdToAnalyze);

      // Step 3: Retrieve full persisted submission details
      setAnalysisStage('Retrieving audited findings and scores...');
      const fullDetails = await submissionService.getSubmission(submissionIdToAnalyze);

      setCurrentSubmission(fullDetails);
      setPendingSubmissionId(null); // Completed cleanly
    } catch (err: any) {
      if (err instanceof ApiError) {
        setAnalysisError(err.message);
      } else {
        setAnalysisError('An unexpected network or service error occurred during analysis.');
      }
    } finally {
      setIsAnalyzing(false);
      setAnalysisStage('');
    }
  };

  // Toggle individual finding resolution
  const handleToggleResolve = async (findingId: string, currentResolved: boolean) => {
    try {
      const updatedFinding = await submissionService.updateFindingStatus(findingId, !currentResolved);
      if (currentSubmission) {
        const updatedFindings = currentSubmission.findings.map((f) =>
          f.id === findingId ? updatedFinding : f
        );
        setCurrentSubmission({
          ...currentSubmission,
          findings: updatedFindings,
        });
      }
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update finding status.';
      setAnalysisError(msg);
    }
  };

  // Save human-reviewed formal revision
  const handleSaveRevision = async (revisedText: string) => {
    if (!currentSubmission) return;
    try {
      await submissionService.createRevision(currentSubmission.id, {
        content: revisedText,
        changes_summary: 'Applied brand-compliant editorial adjustments.',
      });
      // Refresh submission to show updated revision history
      const updated = await submissionService.getSubmission(currentSubmission.id);
      setCurrentSubmission(updated);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Failed to record revision.';
      setAnalysisError(msg);
      throw err;
    }
  };

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);
  const prohibitedTerms = terminology.filter((t) => t.term_type === 'PROHIBITED');

  const isHeuristicFallback = currentSubmission?.summary?.includes('[Heuristic Fallback Engine]');

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <DashboardHeader
        title="Content Review & Brand Verification"
        subtitle="Audit marketing copy against tone parameters, prohibited keywords, and approved facts"
      />

      <div className="p-6 sm:p-8 space-y-6 max-w-7xl">
        {/* Brand loading error */}
        {brandError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between text-red-800 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <span>{brandError}</span>
            </div>
            <button
              type="button"
              onClick={fetchBrands}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Validation error */}
        {validationError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-2 text-amber-800 text-sm">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Analysis pipeline error with Retry button */}
        {analysisError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-800 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <div>
                <span className="font-semibold">Analysis Failure:</span> {analysisError}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleAnalyze()}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-xs font-medium transition-colors self-start sm:self-auto"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>Retry Analysis</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Input */}
          <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4">Input Draft Content</h3>

            <form onSubmit={handleAnalyze} className="space-y-4">
              {/* Brand Selector */}
              <div>
                <label
                  htmlFor="brand-select"
                  className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5"
                >
                  Target Brand Guidelines
                </label>

                {loadingBrands ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                    <span>Loading workspace brands...</span>
                  </div>
                ) : brands.length === 0 ? (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
                    No active brand profiles found in this workspace. Please create a brand first.
                  </div>
                ) : (
                  <select
                    id="brand-select"
                    value={selectedBrandId}
                    onChange={(e) => handleBrandChange(e.target.value)}
                    disabled={isAnalyzing}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-800 disabled:bg-gray-100"
                  >
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name} {brand.industry ? `(${brand.industry})` : ''}
                      </option>
                    ))}
                  </select>
                )}

                {/* Selected Brand Context Pill */}
                {selectedBrand && (
                  <div className="mt-2.5 p-3 bg-gray-50 border border-gray-100 rounded-lg space-y-1.5 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5 font-medium text-gray-700">
                      <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                      <span>Tone of Voice:</span>
                    </div>
                    <p className="italic text-gray-600 pl-5">
                      {extractToneOfVoice(
                        guidelines,
                        selectedBrand.description || 'Standard Enterprise Tone'
                      )}
                    </p>

                    {prohibitedTerms.length > 0 && (
                      <div className="pt-1">
                        <div className="flex items-center gap-1.5 font-medium text-rose-700 mb-1">
                          <Ban className="h-3 w-3 text-rose-500" />
                          <span>{prohibitedTerms.length} Prohibited Terms Active</span>
                        </div>
                        <div className="flex flex-wrap gap-1 pl-4">
                          {prohibitedTerms.slice(0, 4).map((t) => (
                            <span
                              key={t.id}
                              className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded font-mono"
                            >
                              {t.term}
                            </span>
                          ))}
                          {prohibitedTerms.length > 4 && (
                            <span className="text-[10px] text-gray-400">
                              +{prohibitedTerms.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Campaign Title & Channel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="campaign-title"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1"
                  >
                    Campaign / Asset Title
                  </label>
                  <input
                    id="campaign-title"
                    type="text"
                    value={campaignTitle}
                    onChange={(e) => setCampaignTitle(e.target.value)}
                    disabled={isAnalyzing}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 disabled:bg-gray-100"
                    placeholder="e.g. Q4 Launch Announcement"
                  />
                </div>

                <div>
                  <label
                    htmlFor="channel-select"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1"
                  >
                    Target Channel
                  </label>
                  <select
                    id="channel-select"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    disabled={isAnalyzing}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 disabled:bg-gray-100"
                  >
                    <option value="Social Media">Social Media</option>
                    <option value="Email Marketing">Email Marketing</option>
                    <option value="Blog">Blog</option>
                    <option value="Press Release">Press Release</option>
                    <option value="Web Landing Page">Web Landing Page</option>
                  </select>
                </div>
              </div>

              {/* Marketing Copy Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="content-input"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-600"
                  >
                    Marketing Copy to Verify
                  </label>
                  <span className="text-xs text-gray-400 font-mono">{inputText.length} chars</span>
                </div>
                <textarea
                  id="content-input"
                  rows={6}
                  value={inputText}
                  onChange={(e) => handleContentChange(e.target.value)}
                  disabled={isAnalyzing}
                  placeholder="Paste ad copy, email drafts, blog intros, or social posts..."
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 font-normal leading-relaxed disabled:bg-gray-100"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isAnalyzing || !inputText.trim() || !selectedBrandId}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors shadow-sm"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>{analysisStage || 'Analyzing Content...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Analyze Content</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleContentChange(
                      'VELORA offers cheap fast-fashion apparel guaranteed 100% organic with unbeatable miracle fabrics.'
                    )
                  }
                  disabled={isAnalyzing}
                  className="text-xs text-gray-500 hover:text-blue-600 px-2.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Sample Draft
                </button>
              </div>
            </form>

            {/* Workflow Info Box */}
            <div className="mt-6 pt-5 border-t border-gray-100 text-xs text-gray-500 space-y-2">
              <div className="font-semibold text-gray-700">Governance Pipeline:</div>
              <ul className="list-disc pl-4 space-y-1">
                <li>Persists submission to database with full audit trail</li>
                <li>Validates prohibited keywords and mandatory disclaimers</li>
                <li>Evaluates tone and empirical claims against approved knowledge</li>
                <li>Provides suggested rewrites while requiring human editorial sign-off</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Analysis Results */}
          <div className="lg:col-span-7 space-y-6">
            {isAnalyzing ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-600 shadow-sm space-y-3">
                <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
                <h4 className="text-base font-semibold text-gray-900">
                  Executing Brand Compliance Check
                </h4>
                <p className="text-xs text-gray-500 max-w-md mx-auto">{analysisStage}</p>
              </div>
            ) : currentSubmission ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
                {/* Result Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs uppercase font-bold tracking-wider text-gray-400">
                        Audit Report
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        ({currentSubmission.id.slice(0, 8)}...)
                      </span>

                      {/* Engine Tag */}
                      {isHeuristicFallback ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                          <Cpu className="h-3 w-3 text-gray-500" />
                          <span>Heuristic Fallback Engine</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                          <Sparkles className="h-3 w-3 text-indigo-600" />
                          <span>Gemini AI Engine</span>
                        </span>
                      )}

                      <span className="text-xs text-gray-500">
                        • Status: <strong className="text-gray-800">{currentSubmission.status}</strong>
                      </span>
                    </div>

                    <div className="text-xs text-gray-400 mt-1">
                      Submitted {new Date(currentSubmission.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Channel: {currentSubmission.channel || 'Marketing'}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Compliance Score</div>
                      <div className="text-lg font-black text-gray-900">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded border text-sm font-bold ${getScoreBadgeColor(
                            currentSubmission.compliance_score
                          )}`}
                        >
                          {currentSubmission.compliance_score !== null &&
                          currentSubmission.compliance_score !== undefined
                            ? `${Math.round(currentSubmission.compliance_score)}%`
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overall Status Banner */}
                {currentSubmission.overall_status === 'COMPLIANT' ? (
                  <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold">Overall Status: Compliant.</span> Content adheres
                      to active brand parameters. Ready for final human editorial sign-off.
                    </div>
                  </div>
                ) : currentSubmission.overall_status === 'NON_COMPLIANT' ? (
                  <div className="flex items-center gap-3 p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-900 text-xs">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <div>
                      <span className="font-bold">Overall Status: Non-Compliant.</span> Identified{' '}
                      {currentSubmission.findings.length} brand deviations, including critical
                      violations that require correction before publication.
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-bold">Overall Status: Flagged for Revision.</span> Found{' '}
                      {currentSubmission.findings.length} brand deviations requiring review before
                      publishing.
                    </div>
                  </div>
                )}

                {/* Summary Section */}
                {currentSubmission.summary && (
                  <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="font-semibold text-gray-700">Governance Summary:</span>{' '}
                    {currentSubmission.summary}
                  </div>
                )}

                {/* Findings List Section */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center justify-between">
                    <span>Detected Brand Findings & Deviations</span>
                    <span className="text-xs text-gray-500 font-normal">
                      {currentSubmission.findings.length}{' '}
                      {currentSubmission.findings.length === 1 ? 'issue' : 'issues'} identified
                    </span>
                  </h4>
                  <FindingsList
                    findings={currentSubmission.findings}
                    onToggleResolve={handleToggleResolve}
                  />
                </div>

                {/* Suggested Correction Section */}
                {currentSubmission.corrected_content && (
                  <SuggestedCorrection
                    correction={currentSubmission.corrected_content}
                    onApplyToInput={(text) => handleContentChange(text)}
                    onSaveRevision={handleSaveRevision}
                  />
                )}

                {/* Revision History */}
                {currentSubmission.revisions && currentSubmission.revisions.length > 0 && (
                  <div className="border-t border-gray-100 pt-4">
                    <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5 text-blue-600" />
                      <span>Revision History ({currentSubmission.revisions.length})</span>
                    </h5>
                    <div className="space-y-1.5 text-xs text-gray-600">
                      {currentSubmission.revisions.map((rev) => (
                        <div
                          key={rev.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100"
                        >
                          <div>
                            <span className="font-semibold text-gray-800">
                              Version {rev.version}
                            </span>
                            {rev.changes_summary && (
                              <span className="text-gray-500 ml-2">— {rev.changes_summary}</span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400 font-mono">
                            {new Date(rev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400 space-y-2">
                <Sparkles className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">No Content Analysis Run Yet</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Select a brand, enter marketing copy in the draft editor, and click "Analyze
                  Content" to run the live compliance pipeline.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
