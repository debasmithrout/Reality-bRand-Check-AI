import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { FindingsList } from '../components/review/FindingsList';
import { SuggestedCorrection } from '../components/review/SuggestedCorrection';
import { brandService, reviewService } from '../services/api';
import { Brand, ContentReviewResult } from '../types';
import { Alert } from '../components/common/Alert';
import { getScoreBadgeColor } from '../utils/formatters';
import { Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';

export const ContentReviewPage: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('b-1');
  const [inputText, setInputText] = useState<string>(
    'Nexus Cloud offers cheap enterprise servers with guaranteed 100% uptime for all operations.'
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<ContentReviewResult | null>(null);

  useEffect(() => {
    brandService.getBrands().then((data) => {
      setBrands(data);
      if (data.length > 0) {
        setSelectedBrandId(data[0].id);
      }
    });

    // Auto-run initial demo analysis for showcase
    reviewService.analyzeContent(inputText, 'b-1').then(setAnalysisResult);
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    try {
      const result = await reviewService.analyzeContent(inputText, selectedBrandId);
      setAnalysisResult(result);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <DashboardHeader
        title="Content Review & Brand Verification"
        subtitle="Audit marketing copy against tone parameters, prohibited keywords, and approved facts"
      />

      <div className="p-6 sm:p-8 space-y-6 max-w-7xl">
        {/* Transparent Demo Notice */}
        <Alert type="info" title="Demo Analysis Mode Active">
          This preview uses clearly labeled demo analysis rules and sample findings. Gemini AI analysis and FastAPI services will be plugged in directly once the backend pipeline is enabled.
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form Input */}
          <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4">Input Draft Content</h3>

            <form onSubmit={handleAnalyze} className="space-y-4">
              <div>
                <label htmlFor="brand-select" className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Target Brand Guidelines
                </label>
                <select
                  id="brand-select"
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-800"
                >
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
                {selectedBrand && (
                  <p className="mt-1.5 text-xs text-gray-500 italic">
                    Tone: {selectedBrand.voiceTone}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="content-input" className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
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
                  disabled={isAnalyzing || !inputText.trim()}
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
                Click "Analyze Content" to view sample findings and automated rewrites.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

