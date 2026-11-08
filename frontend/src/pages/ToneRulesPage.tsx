import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { brandService } from '../services/brandService';
import {
  BrandResponse,
  TerminologyCreatePayload,
  TerminologyResponse,
  TerminologyType,
  TerminologyUpdatePayload,
} from '../types';
import { ApiError } from '../services/httpClient';
import {
  Plus,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  Building2,
  ArrowRight,
  ShieldCheck,
  Ban,
  Tag,
} from 'lucide-react';

export const ToneRulesPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [brands, setBrands] = useState<BrandResponse[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [terms, setTerms] = useState<TerminologyResponse[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TerminologyType>('ALL');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [editModalTerm, setEditModalTerm] = useState<TerminologyResponse | null>(null);
  const [deleteConfirmTerm, setDeleteConfirmTerm] = useState<TerminologyResponse | null>(null);

  // Form Fields
  const [formTerm, setFormTerm] = useState<string>('');
  const [formType, setFormType] = useState<TerminologyType>('PROHIBITED');
  const [formReplacement, setFormReplacement] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formCaseSensitive, setFormCaseSensitive] = useState<boolean>(false);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isReviewer = user?.role === 'REVIEWER';
  const canManage = user?.role === 'ADMIN' || user?.role === 'EDITOR';

  // 1. Load Brands
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
    } catch {
      setError('Failed to load workspace brand profiles.');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  // 2. Load Terminology for Selected Brand
  const loadTerminology = useCallback(async (brandId: string) => {
    if (!brandId) return;
    setLoading(true);
    setError(null);
    try {
      const t = await brandService.getTerminology(brandId);
      setTerms(t || []);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load terminology rules.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBrandId) {
      setSearchParams({ brandId: selectedBrandId });
      loadTerminology(selectedBrandId);
    }
  }, [selectedBrandId, loadTerminology, setSearchParams]);

  // Filtered terms
  const filteredTerms = useMemo(() => {
    return terms.filter((item) => {
      const matchesSearch =
        item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.preferred_replacement &&
          item.preferred_replacement.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType =
        typeFilter === 'ALL'
          ? true
          : typeFilter === 'APPROVED'
          ? item.term_type === 'APPROVED' || item.term_type === 'PREFERRED'
          : item.term_type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [terms, searchQuery, typeFilter]);

  const openCreateModal = () => {
    setFormTerm('');
    setFormType('PROHIBITED');
    setFormReplacement('');
    setFormDescription('');
    setFormCaseSensitive(false);
    setFormError(null);
    setCreateModalOpen(true);
  };

  const openEditModal = (t: TerminologyResponse) => {
    setEditModalTerm(t);
    setFormTerm(t.term);
    setFormType(t.term_type);
    setFormReplacement(t.preferred_replacement || '');
    setFormDescription(t.description || '');
    setFormCaseSensitive(t.is_case_sensitive);
    setFormError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTerm.trim()) {
      setFormError('Term is required.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    const payload: TerminologyCreatePayload = {
      term: formTerm.trim(),
      term_type: formType,
      preferred_replacement: formReplacement.trim() || undefined,
      description: formDescription.trim() || undefined,
      is_case_sensitive: formCaseSensitive,
    };

    try {
      await brandService.createTerminology(selectedBrandId, payload);
      setCreateModalOpen(false);
      setSuccess(`Term "${payload.term}" added successfully.`);
      setTimeout(() => setSuccess(null), 4000);
      await loadTerminology(selectedBrandId);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to add terminology rule.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalTerm || !selectedBrandId) return;
    if (!formTerm.trim()) {
      setFormError('Term is required.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    const payload: TerminologyUpdatePayload = {
      term: formTerm.trim(),
      term_type: formType,
      preferred_replacement: formReplacement.trim() || undefined,
      description: formDescription.trim() || undefined,
      is_case_sensitive: formCaseSensitive,
    };

    try {
      await brandService.updateTerminology(selectedBrandId, editModalTerm.id, payload);
      setEditModalTerm(null);
      setSuccess(`Term "${payload.term}" updated.`);
      setTimeout(() => setSuccess(null), 4000);
      await loadTerminology(selectedBrandId);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update terminology rule.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmTerm || !selectedBrandId) return;
    setFormSubmitting(true);
    try {
      await brandService.deleteTerminology(selectedBrandId, deleteConfirmTerm.id);
      const deletedName = deleteConfirmTerm.term;
      setDeleteConfirmTerm(null);
      setSuccess(`Term "${deletedName}" removed.`);
      setTimeout(() => setSuccess(null), 4000);
      await loadTerminology(selectedBrandId);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete term.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <DashboardHeader
        title="AI Tone Rules & Terminology"
        subtitle="Manage prohibited keywords, approved brand vocabulary, and suggested replacements"
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
              onClick={() => loadTerminology(selectedBrandId)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Brand Selector & Action Bar */}
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
                disabled={loading}
                className="border border-gray-300 rounded-lg py-2 px-3 text-sm bg-white font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.industry ? `(${b.industry})` : ''}
                  </option>
                ))}
              </select>
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
                onClick={openCreateModal}
                disabled={!selectedBrandId || loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-xl transition-colors shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Add Term Rule</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => loadTerminology(selectedBrandId)}
              disabled={loading}
              className="p-2.5 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              title="Reload terminology"
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
              Tone rules and keywords belong to a brand. Configure a brand profile to manage terminology.
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

        {/* Terminology Workspace */}
        {!loading && selectedBrand && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search keywords, replacements, or rules..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Type Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-medium text-gray-600">
                <button
                  type="button"
                  onClick={() => setTypeFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    typeFilter === 'ALL'
                      ? 'bg-white text-gray-900 font-bold shadow-xs'
                      : 'hover:text-gray-900'
                  }`}
                >
                  All ({terms.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('PROHIBITED')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    typeFilter === 'PROHIBITED'
                      ? 'bg-white text-rose-700 font-bold shadow-xs'
                      : 'hover:text-gray-900'
                  }`}
                >
                  Prohibited ({terms.filter((t) => t.term_type === 'PROHIBITED').length})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('APPROVED')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    typeFilter === 'APPROVED'
                      ? 'bg-white text-emerald-700 font-bold shadow-xs'
                      : 'hover:text-gray-900'
                  }`}
                >
                  Approved / Preferred (
                  {terms.filter((t) => t.term_type === 'APPROVED' || t.term_type === 'PREFERRED').length}
                  )
                </button>
              </div>
            </div>

            {/* Terminology List */}
            {filteredTerms.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500 shadow-xs space-y-3">
                <Tag className="h-8 w-8 text-gray-300 mx-auto" />
                <p className="text-sm font-semibold text-gray-700">No Terminology Rules Found</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  {searchQuery || typeFilter !== 'ALL'
                    ? 'No terms match your active search or category filter.'
                    : `No terminology rules configured for "${selectedBrand.name}". Add your first keyword directive.`}
                </p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700">
                    <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px] font-semibold">
                      <tr>
                        <th className="py-3 px-4">Term / Keyword</th>
                        <th className="py-3 px-4">Directive Type</th>
                        <th className="py-3 px-4">Suggested Replacement</th>
                        <th className="py-3 px-4">Rule Explanation</th>
                        <th className="py-3 px-4 text-center">Case Match</th>
                        {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredTerms.map((termItem) => {
                        const isProhibited = termItem.term_type === 'PROHIBITED';
                        return (
                          <tr key={termItem.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                              <span
                                className={`px-2 py-0.5 rounded border ${
                                  isProhibited
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {termItem.term}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded ${
                                  isProhibited
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {isProhibited ? <Ban className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                                {termItem.term_type}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              {termItem.preferred_replacement ? (
                                <span className="font-medium text-emerald-700 flex items-center gap-1.5">
                                  <ArrowRight className="h-3 w-3 text-gray-400" />
                                  <span>{termItem.preferred_replacement}</span>
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">None</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-gray-600 max-w-xs truncate">
                              {termItem.description || <span className="text-gray-400 italic">—</span>}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              {termItem.is_case_sensitive ? (
                                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  Strict
                                </span>
                              ) : (
                                <span className="text-[11px] text-gray-400">Any</span>
                              )}
                            </td>

                            {canManage && (
                              <td className="py-3.5 px-4 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(termItem)}
                                    className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Edit term rule"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmTerm(termItem)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete term rule"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200">
            <h4 className="text-base font-bold text-gray-900 mb-1">Add Terminology Rule</h4>
            <p className="text-xs text-gray-500 mb-4">
              Define keywords to prohibit or approve, and configure automated suggested replacements.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Term / Phrase <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTerm}
                  onChange={(e) => setFormTerm(e.target.value)}
                  placeholder="e.g. cheap fast-fashion, miracle fabrics"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Directive Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as TerminologyType)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                >
                  <option value="PROHIBITED">PROHIBITED (Flags violation)</option>
                  <option value="PREFERRED">PREFERRED (Approved vocabulary)</option>
                  <option value="APPROVED">APPROVED (Authorized brand term)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Preferred Suggested Replacement
                </label>
                <input
                  type="text"
                  value={formReplacement}
                  onChange={(e) => setFormReplacement(e.target.value)}
                  placeholder="e.g. sustainably crafted couture"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-emerald-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Reason / Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Conflicts with luxury circular fashion positioning"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="case-sensitive-chk"
                  checked={formCaseSensitive}
                  onChange={(e) => setFormCaseSensitive(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="case-sensitive-chk" className="font-semibold text-gray-700">
                  Strict Case-Sensitive Matching
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={formSubmitting}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center gap-2"
                >
                  {formSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Term Rule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editModalTerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200">
            <h4 className="text-base font-bold text-gray-900 mb-1">Edit Terminology Rule</h4>
            <p className="text-xs text-gray-500 mb-4">Modify the term or its suggested replacement.</p>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Term / Phrase <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTerm}
                  onChange={(e) => setFormTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Directive Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as TerminologyType)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                >
                  <option value="PROHIBITED">PROHIBITED (Flags violation)</option>
                  <option value="PREFERRED">PREFERRED (Approved vocabulary)</option>
                  <option value="APPROVED">APPROVED (Authorized brand term)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Preferred Suggested Replacement
                </label>
                <input
                  type="text"
                  value={formReplacement}
                  onChange={(e) => setFormReplacement(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-emerald-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Reason / Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-case-sensitive-chk"
                  checked={formCaseSensitive}
                  onChange={(e) => setFormCaseSensitive(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="edit-case-sensitive-chk" className="font-semibold text-gray-700">
                  Strict Case-Sensitive Matching
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditModalTerm(null)}
                  disabled={formSubmitting}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center gap-2"
                >
                  {formSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmTerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-gray-900">Delete Term Rule?</h4>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Are you sure you want to remove <strong>"{deleteConfirmTerm.term}"</strong> from the brand terminology rules?
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteConfirmTerm(null)}
                disabled={formSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={formSubmitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5"
              >
                {formSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>Yes, Delete Term</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
