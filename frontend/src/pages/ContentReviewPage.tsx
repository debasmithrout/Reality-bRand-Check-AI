import React, { useState, useEffect, useCallback } from 'react';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { FindingsList } from '../components/review/FindingsList';
import { SuggestedCorrection } from '../components/review/SuggestedCorrection';
import { reviewService } from '../services/api';
import { brandService, extractToneOfVoice } from '../services/brandService';
import { BrandResponse, ContentReviewResult, GuidelineResponse, TerminologyResponse } from '../types';
import { Alert } from '../components/common/Alert';
import { getScoreBadgeColor } from '../utils/formatters';
import { Sparkles, RefreshCw, AlertTriangle, AlertCircle, BookOpen, Ban } from 'lucide-react';
import { ApiError } from '../services/httpClient';

export const ContentReviewPage: React.FC = () => {
  const [brands, setBrands] = useState<BrandResponse[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [guidelines, setGuidelines] = useState<GuidelineResponse | null>(null);
  const [terminology, setTerminology] = useState<TerminologyResponse[]>([]);
  const [loadingBrands, setLoadingBrands] = useState<boolean>(true);
  const [brandError, setBrandError] = useState<string | null>(null);

  const [inputText, setInputText] = useState<string>(
    'Nexus Cloud offers cheap enterprise servers with guaranteed 100% uptime for all operations.'
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<ContentReviewResult | null>(null);

  // Load brands for workspace
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

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedBrandId) return;

    setIsAnalyzing(true);
    try {
      const result = await reviewService.analyzeContent(inputText, selectedBrandId);
      setAnalysisResult(result);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);
  const prohibitedTerms = terminology.filter((t) => t.term_type === 'PROHIBITED');

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <DashboardHeader
        title="Content Review & Brand Verification"
        subtitle="Audit marketing copy against tone parameters, prohibited keywords, and approved facts"
      />

      <div className="p-6 sm:p-8 space-y-6 max-w-7xl">
        {/* Brand loading error alert */}
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

        {/* Notice for Demo AI Analysis */}
        <Alert type="info" title="Phase 4B Connected: Live Brand & Guidelines Integration">
          Brand profiles, guidelines, and terminology rules are now dynamically loaded from your active FastAPI workspace. AI submission & real-time evaluation pipeline is scheduled for Phase 4C.
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Input */}
          <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4">Input Draft Content</h3>

            <form onSubmit={handleAnalyze} className="space-y-4">
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
                    No active brand profiles found in this workspace.
                  </div>
                ) : (
                  <select
                    id="brand-select"
                    value={selectedBrandId}
                    onChange={(e) => setSelectedBrandId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-800"
                  >
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name} {brand.industry ? `(${brand.industry})` : ''}
                      </option>
                    ))}
                  </select>
                )}

                {/* Selected Brand Guidelines Snippet */}
                {selectedBrand && (
                  <div className="mt-2.5 p-3 bg-gray-50 border border-gray-100 rounded-lg space-y-1.5 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5 font-medium text-gray-700">
                      <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                      <span>Tone of Voice:</span>
                    </div>
                    <p className="italic text-gray-600 pl-5">
                      {extractToneOfVoice(guidelines, selectedBrand.description || 'Standard Enterprise Tone')}
                    </p>

                    {prohibitedTerms.length > 0 && (
                      <div className="pt-1">
                        <div className="flex items-center gap-1.5 font-medium text-rose-700 mb-1">
                          <Ban className="h-3 w-3 text-rose-500" />
                          <span>{prohibitedTerms.length} Prohibited Terms Loaded</span>
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
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste ad copy, email drafts, blog intros, or social posts..."
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 font-normal leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isAnalyzing || !inputText.trim() || !selectedBrandId}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors shadow-sm"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Analyzing Against Brand...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analyze Content
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setInputText(
                      'Nexus Cloud offers cheap enterprise servers with guaranteed 100% uptime for all operations.'
                    )
                  }
                  className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 border border-gray-200 rounded"
                >
                  Load Sample
                </button>
              </div>
            </form>

            {/* Quick reference guide */}
            <div className="mt-6 pt-6 border-t border-gray-100 text-xs text-gray-500 space-y-2">
              <div className="font-semibold text-gray-700">What the scanner checks:</div>
              <ul className="list-disc pl-4 space-y-1">
                <li>Banned and high-risk terminology</li>
                <li>Absolute guarantees and unverified claims</li>
                <li>Enterprise tone & voice consistency</li>
                <li>Mandatory legal disclaimers</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Analysis Results */}
          <div className="lg:col-span-7 space-y-6">
            {analysisResult ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
                {/* Result Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase font-bold tracking-wider text-gray-400">
                        Audit Report
                      </span>
                      <span className="text-xs text-gray-400 font-mono">({analysisResult.id})</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{analysisResult.createdAt}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Compliance Score</div>
                      <div className="text-lg font-black text-gray-900">
                        <span
                          className={`inline-block px-2 py-0.5 rounded border text-sm ${getScoreBadgeColor(
                            analysisResult.overallScore
                          )}`}
                        >
                          {analysisResult.overallScore} / 100
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Notice */}
                <div className="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold">Status: Needs Revision.</span> Found{' '}
                    {analysisResult.findings.length} brand deviations requiring review before publishing.
                  </div>
                </div>

                {/* Findings List Section */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center justify-between">
                    <span>Detected Brand Findings & Deviations</span>
                    <span className="text-xs text-gray-500 font-normal">
                      {analysisResult.findings.length} issues identified
                    </span>
                  </h4>
                  <FindingsList findings={analysisResult.findings} />
                </div>

                {/* Suggested Correction Section */}
                <SuggestedCorrection correction={analysisResult.suggestedCorrection} />
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
                Click "Analyze Content" to view findings and automated rewrites.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

