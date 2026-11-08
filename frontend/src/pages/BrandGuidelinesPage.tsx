import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { brandService } from '../services/brandService';
import { BrandResponse, GuidelineCreatePayload, GuidelineResponse } from '../types';
import { ApiError } from '../services/httpClient';
import {
  ShieldCheck,
  Building2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Save,
  Sparkles,
  BookOpen,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

const PRESET_PERSONALITIES = [
  'Sophisticated',
  'Modern',
  'Professional',
  'Confident',
  'Minimalist',
  'Friendly',
  'Mindful',
  'Factual',
  'Authoritative',
  'Eco-Conscious',
  'Empowering',
  'Understated',
];

export const BrandGuidelinesPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [brands, setBrands] = useState<BrandResponse[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [guidelines, setGuidelines] = useState<GuidelineResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [personalityTags, setPersonalityTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState<string>('');
  const [toneSummary, setToneSummary] = useState<string>('');
  const [dosList, setDosList] = useState<string[]>([]);
  const [newDoInput, setNewDoInput] = useState<string>('');
  const [dontsList, setDontsList] = useState<string[]>([]);
  const [newDontInput, setNewDontInput] = useState<string>('');
  const [tagline, setTagline] = useState<string>('');
  const [additionalRules, setAdditionalRules] = useState<string>('');

  const isReviewer = user?.role === 'REVIEWER';

  // 1. Fetch available brands
  const loadBrands = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await brandService.getBrands();
      setBrands(data || []);
      const paramBrandId = searchParams.get('brandId');
      if (paramBrandId && data.some((b) => b.id === paramBrandId)) {
        setSelectedBrandId(paramBrandId);
      } else if (data.length > 0) {
        setSelectedBrandId(data[0].id);
      }
    } catch (err: any) {
      setError('Failed to load workspace brand profiles.');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  // 2. Load guidelines for selected brand
  const loadGuidelines = useCallback(async (brandId: string) => {
    if (!brandId) return;
    setLoading(true);
    setError(null);
    try {
      const g = await brandService.getGuidelines(brandId);
      setGuidelines(g);
      if (g) {
        // Parse Personality
        if (Array.isArray(g.brand_personality)) {
          setPersonalityTags(g.brand_personality);
        } else if (typeof g.brand_personality === 'string') {
          setPersonalityTags(g.brand_personality.split(',').map((s) => s.trim()).filter(Boolean));
        } else {
          setPersonalityTags([]);
        }

        // Parse Tone of Voice
        if (g.tone_of_voice && typeof g.tone_of_voice === 'object') {
          const tov = g.tone_of_voice as any;
          setDosList(Array.isArray(tov.dos) ? tov.dos : []);
          setDontsList(Array.isArray(tov.donts) ? tov.donts : []);
          setToneSummary(tov.summary || tov.tone || '');
        } else if (typeof g.tone_of_voice === 'string') {
          setToneSummary(g.tone_of_voice);
          setDosList([]);
          setDontsList([]);
        }

        // Parse Messaging Rules
        if (g.messaging_rules && typeof g.messaging_rules === 'object') {
          const mr = g.messaging_rules as any;
          setTagline(mr.tagline || mr.headline || '');
        } else if (typeof g.messaging_rules === 'string') {
          setTagline(g.messaging_rules);
        } else {
          setTagline('');
        }

        setAdditionalRules(g.additional_guidelines || '');
      } else {
        // Defaults if not yet set
        setPersonalityTags([]);
        setToneSummary('');
        setDosList([]);
        setDontsList([]);
        setTagline('');
        setAdditionalRules('');
      }
    } catch {
      setGuidelines(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBrandId) {
      setSearchParams({ brandId: selectedBrandId });
      loadGuidelines(selectedBrandId);
    }
  }, [selectedBrandId, loadGuidelines, setSearchParams]);

  const togglePersonalityTag = (tag: string) => {
    if (isReviewer) return;
    setPersonalityTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (isReviewer) return;
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const clean = customTagInput.trim();
    if (clean && !personalityTags.includes(clean)) {
      setPersonalityTags([...personalityTags, clean]);
      setCustomTagInput('');
    }
  };

  const handleAddDo = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReviewer || !newDoInput.trim()) return;
    setDosList([...dosList, newDoInput.trim()]);
    setNewDoInput('');
  };

  const handleRemoveDo = (index: number) => {
    if (isReviewer) return;
    setDosList(dosList.filter((_, i) => i !== index));
  };

  const handleAddDont = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReviewer || !newDontInput.trim()) return;
    setDontsList([...dontsList, newDontInput.trim()]);
    setNewDontInput('');
  };

  const handleRemoveDont = (index: number) => {
    if (isReviewer) return;
    setDontsList(dontsList.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (isReviewer || !selectedBrandId) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload: GuidelineCreatePayload = {
      brand_personality: personalityTags,
      tone_of_voice: {
        summary: toneSummary.trim() || undefined,
        dos: dosList,
        donts: dontsList,
      },
      messaging_rules: {
        tagline: tagline.trim() || undefined,
      },
      additional_guidelines: additionalRules.trim() || undefined,
    };

    try {
      await brandService.saveGuidelines(selectedBrandId, payload);
      setSuccess('Brand guidelines saved successfully.');
      setTimeout(() => setSuccess(null), 4000);
      await loadGuidelines(selectedBrandId);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to save brand guidelines.');
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <DashboardHeader
        title="Brand Guidelines & Tone Policies"
        subtitle="Configure the personality traits, tone of voice dos/don'ts, and messaging boundaries used by the AI engine"
      />

      <div className="p-6 sm:p-8 space-y-6 max-w-7xl">
        {/* Success Banner */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-800 text-sm shadow-xs">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-3 text-red-800 text-sm shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadGuidelines(selectedBrandId)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Top Control Bar: Brand Selector & Actions */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label htmlFor="brand-select" className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Active Brand:
            </label>
            {brands.length === 0 ? (
              <span className="text-xs text-gray-400 italic">No brands found</span>
            ) : (
              <select
                id="brand-select"
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                disabled={loading || saving}
                className="border border-gray-300 rounded-lg py-2 px-3 text-sm bg-white font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.industry ? `(${b.industry})` : ''}
                  </option>
                ))}
              </select>
            )}
            {guidelines?.updated_at && (
              <span className="text-[11px] text-gray-400 hidden md:inline">
                Last updated: {new Date(guidelines.updated_at).toLocaleDateString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isReviewer ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg border border-gray-200">
                <ShieldCheck className="h-4 w-4 text-gray-500" />
                Reviewer Access (Read-Only)
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading || !selectedBrandId}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-xl transition-colors shadow-xs"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Saving Guidelines...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Guidelines</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => loadGuidelines(selectedBrandId)}
              disabled={loading}
              className="p-2.5 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              title="Reload guidelines"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Empty Brands Prompt */}
        {!loading && brands.length === 0 && (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center text-gray-600 shadow-xs max-w-xl mx-auto space-y-4">
            <Building2 className="h-10 w-10 text-gray-400 mx-auto" />
            <h4 className="text-base font-bold text-gray-900">Create a Brand Profile First</h4>
            <p className="text-xs text-gray-500">
              Guidelines are linked to a brand. Please configure a brand profile to start establishing tone parameters.
            </p>
            <Link
              to="/brands"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl shadow-xs"
            >
              <span>Go to Brand Profiles</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* Main Content Layout */}
        {!loading && selectedBrand && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form Sections */}
            <div className="lg:col-span-2 space-y-6">
              {/* SECTION 1: Brand Personality Traits */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    1. Brand Personality & Archetype
                  </h4>
                </div>
                <p className="text-xs text-gray-500">
                  Select key adjectives that describe your brand's character. The AI engine flags marketing copy that deviates from these traits.
                </p>

                {/* Preset Tag Cloud */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {PRESET_PERSONALITIES.map((trait) => {
                    const selected = personalityTags.includes(trait);
                    return (
                      <button
                        key={trait}
                        type="button"
                        onClick={() => togglePersonalityTag(trait)}
                        disabled={isReviewer}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                          selected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        } ${isReviewer ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        {trait}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Personality Tag Input */}
                {!isReviewer && (
                  <div className="flex items-center gap-2 pt-3">
                    <input
                      type="text"
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      onKeyDown={handleAddCustomTag}
                      placeholder="Add custom trait (e.g. Groundbreaking, Ethical)..."
                      className="flex-1 border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomTag}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg"
                    >
                      Add Trait
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION 2: Tone of Voice & Dos/Don'ts */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    2. Tone of Voice & Communication Directives
                  </h4>
                </div>

                {/* Overall Tone Summary */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tone of Voice Summary
                  </label>
                  <input
                    type="text"
                    value={toneSummary}
                    onChange={(e) => setToneSummary(e.target.value)}
                    disabled={isReviewer}
                    placeholder="e.g. Quiet luxury, empirical, understated, and factual"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>

                {/* Two-column Dos & Don'ts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* DO's */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-emerald-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Tone Dos (Mandatory Elements)</span>
                    </div>

                    {!isReviewer && (
                      <form onSubmit={handleAddDo} className="flex gap-2">
                        <input
                          type="text"
                          value={newDoInput}
                          onChange={(e) => setNewDoInput(e.target.value)}
                          placeholder="e.g. Reference verified materials"
                          className="flex-1 border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          type="submit"
                          className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                          title="Add Do directive"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    )}

                    <div className="space-y-1.5">
                      {dosList.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No Do directives configured yet.</p>
                      ) : (
                        dosList.map((doItem, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 p-2 bg-emerald-50/70 border border-emerald-100 rounded-lg text-xs text-emerald-900"
                          >
                            <span>• {doItem}</span>
                            {!isReviewer && (
                              <button
                                type="button"
                                onClick={() => handleRemoveDo(idx)}
                                className="text-emerald-700 hover:text-red-600"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* DONT's */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-rose-700">
                      <AlertCircle className="h-4 w-4 text-rose-600" />
                      <span>Tone Don'ts (Strictly Prohibited)</span>
                    </div>

                    {!isReviewer && (
                      <form onSubmit={handleAddDont} className="flex gap-2">
                        <input
                          type="text"
                          value={newDontInput}
                          onChange={(e) => setNewDontInput(e.target.value)}
                          placeholder="e.g. Avoid aggressive sales hype"
                          className="flex-1 border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                        <button
                          type="submit"
                          className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
                          title="Add Don't directive"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    )}

                    <div className="space-y-1.5">
                      {dontsList.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No Don't directives configured yet.</p>
                      ) : (
                        dontsList.map((dontItem, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 p-2 bg-rose-50/70 border border-rose-100 rounded-lg text-xs text-rose-900"
                          >
                            <span>• {dontItem}</span>
                            {!isReviewer && (
                              <button
                                type="button"
                                onClick={() => handleRemoveDont(idx)}
                                className="text-rose-700 hover:text-red-600"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Messaging Rules & Additional Guidelines */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    3. Mandatory Messaging & Compliance Rules
                  </h4>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Canonical Brand Tagline / Positioning
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    disabled={isReviewer}
                    placeholder="e.g. Sustainable Performance Engineered for the Mindful Athlete"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Additional Governance Directives & Restrictions
                  </label>
                  <textarea
                    rows={4}
                    value={additionalRules}
                    onChange={(e) => setAdditionalRules(e.target.value)}
                    disabled={isReviewer}
                    placeholder="e.g. All environmental and performance claims must be backed by GOTS or biomechanical lab reports. Never claim 100% organic unless all fibers meet verified certifications."
                    className="w-full border border-gray-300 rounded-lg p-3 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Identity Card & Governance Summary */}
            <div className="space-y-6">
              {/* Brand Summary Card */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-gray-900 text-sm">Brand Profile Context</h5>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Linked
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-gray-400">Name:</span>
                    <p className="font-semibold text-gray-800">{selectedBrand.name}</p>
                  </div>
                  {selectedBrand.industry && (
                    <div>
                      <span className="text-gray-400">Industry:</span>
                      <p className="font-medium text-gray-800">{selectedBrand.industry}</p>
                    </div>
                  )}
                  {selectedBrand.website && (
                    <div>
                      <span className="text-gray-400">Website:</span>
                      <p className="font-medium text-blue-600 truncate">{selectedBrand.website}</p>
                    </div>
                  )}
                  {selectedBrand.description && (
                    <div>
                      <span className="text-gray-400">Description:</span>
                      <p className="text-gray-600 line-clamp-4 leading-relaxed mt-0.5">
                        {selectedBrand.description}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                  <Link
                    to={`/tone-rules?brandId=${selectedBrand.id}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs text-gray-700 font-medium"
                  >
                    <span>Manage Prohibited Terminology</span>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                  </Link>
                  <Link
                    to={`/facts?brandId=${selectedBrand.id}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs text-gray-700 font-medium"
                  >
                    <span>Inspect Approved Evidence</span>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                  </Link>
                </div>
              </div>

              {/* Explainer Box */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-5 text-xs text-blue-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <HelpCircle className="h-4 w-4 text-blue-600" />
                  <span>How AI Uses These Guidelines</span>
                </div>
                <p className="leading-relaxed text-blue-800">
                  During content review, Gemini compares incoming marketing drafts against these exact traits, Do/Don't lists, and disclaimers. Deviations generate flagged findings with precise suggestions.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
