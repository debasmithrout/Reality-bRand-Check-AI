import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { brandService } from '../services/brandService';
import {
  ApprovedFactCreatePayload,
  ApprovedFactResponse,
  ApprovedFactUpdatePayload,
  BrandResponse,
} from '../types';
import { ApiError } from '../services/httpClient';
import {
  FileCheck2,
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
  FileText,
  Clock,
  Archive,
  Info,
} from 'lucide-react';

export const ApprovedFactsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [brands, setBrands] = useState<BrandResponse[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [facts, setFacts] = useState<ApprovedFactResponse[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING_REVIEW' | 'DEPRECATED'>('ALL');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [editModalFact, setEditModalFact] = useState<ApprovedFactResponse | null>(null);
  const [deleteConfirmFact, setDeleteConfirmFact] = useState<ApprovedFactResponse | null>(null);

  // Form Fields
  const [formClaim, setFormClaim] = useState<string>('');
  const [formEvidence, setFormEvidence] = useState<string>('');
  const [formSource, setFormSource] = useState<string>('');
  const [formStatus, setFormStatus] = useState<string>('APPROVED');
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

  // 2. Load Facts for Selected Brand
  const loadFacts = useCallback(async (brandId: string) => {
    if (!brandId) return;
    setLoading(true);
    setError(null);
    try {
      const f = await brandService.getFacts(brandId);
      setFacts(f || []);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load verified approved facts.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBrandId) {
      setSearchParams({ brandId: selectedBrandId });
      loadFacts(selectedBrandId);
    }
  }, [selectedBrandId, loadFacts, setSearchParams]);

  // Filtered facts
  const filteredFacts = useMemo(() => {
    return facts.filter((f) => {
      const matchesSearch =
        f.claim.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.evidence.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.source && f.source.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL' ? true : f.approval_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [facts, searchQuery, statusFilter]);

  const openCreateModal = () => {
    setFormClaim('');
    setFormEvidence('');
    setFormSource('');
    setFormStatus('APPROVED');
    setFormError(null);
    setCreateModalOpen(true);
  };

  const openEditModal = (f: ApprovedFactResponse) => {
    setEditModalFact(f);
    setFormClaim(f.claim);
    setFormEvidence(f.evidence);
    setFormSource(f.source || '');
    setFormStatus(f.approval_status);
    setFormError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClaim.trim() || !formEvidence.trim()) {
      setFormError('Both Claim and Evidence are mandatory.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    const payload: ApprovedFactCreatePayload = {
      claim: formClaim.trim(),
      evidence: formEvidence.trim(),
      source: formSource.trim() || undefined,
      approval_status: formStatus,
    };

    try {
      await brandService.createFact(selectedBrandId, payload);
      setCreateModalOpen(false);
      setSuccess('Approved fact registered successfully.');
      setTimeout(() => setSuccess(null), 4000);
      await loadFacts(selectedBrandId);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to register approved fact.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalFact || !selectedBrandId) return;
    if (!formClaim.trim() || !formEvidence.trim()) {
      setFormError('Both Claim and Evidence are mandatory.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    const payload: ApprovedFactUpdatePayload = {
      claim: formClaim.trim(),
      evidence: formEvidence.trim(),
      source: formSource.trim() || undefined,
      approval_status: formStatus,
    };

    try {
      await brandService.updateFact(selectedBrandId, editModalFact.id, payload);
      setEditModalFact(null);
      setSuccess('Approved fact updated successfully.');
      setTimeout(() => setSuccess(null), 4000);
      await loadFacts(selectedBrandId);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update approved fact.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmFact || !selectedBrandId) return;
    setFormSubmitting(true);
    try {
      await brandService.deleteFact(selectedBrandId, deleteConfirmFact.id);
      setDeleteConfirmFact(null);
      setSuccess('Approved fact deleted.');
      setTimeout(() => setSuccess(null), 4000);
      await loadFacts(selectedBrandId);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete fact.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <DashboardHeader
        title="Approved Facts & Grounding Hub"
        subtitle="Manage verified empirical claims, lab benchmarks, and certification evidence used for AI truth verification"
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
              onClick={() => loadFacts(selectedBrandId)}
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
                <span>Register Approved Fact</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => loadFacts(selectedBrandId)}
              disabled={loading}
              className="p-2.5 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              title="Reload facts"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Disclaimer / Guidance Callout */}
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3 text-xs text-indigo-900">
          <Info className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Empirical Truth Safeguard:</span> All claims in this knowledge hub represent ground-truth verified evidence. The AI analysis engine grounds every marketing statement against these records. If marketing copy makes unverified empirical assertions without matching approved facts, it is marked <strong className="text-indigo-950 font-bold">UNSUPPORTED</strong> or <strong className="text-rose-700 font-bold">CONTRADICTED</strong>.
          </div>
        </div>

        {/* Empty Brands Prompt */}
        {!loading && brands.length === 0 && (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center text-gray-600 shadow-xs max-w-xl mx-auto space-y-4">
            <Building2 className="h-10 w-10 text-gray-400 mx-auto" />
            <h4 className="text-base font-bold text-gray-900">Create a Brand Profile First</h4>
            <p className="text-xs text-gray-500">
              Approved facts and evidence belong to a brand. Please configure a brand profile to manage facts.
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

        {/* Main Facts View */}
        {!loading && selectedBrand && (
          <div className="space-y-6">
            {/* Search & Status Filters */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search claims, evidence citations, or sources..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-medium text-gray-600">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    statusFilter === 'ALL'
                      ? 'bg-white text-gray-900 font-bold shadow-xs'
                      : 'hover:text-gray-900'
                  }`}
                >
                  All ({facts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('APPROVED')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    statusFilter === 'APPROVED'
                      ? 'bg-white text-emerald-700 font-bold shadow-xs'
                      : 'hover:text-gray-900'
                  }`}
                >
                  Approved ({facts.filter((f) => f.approval_status === 'APPROVED').length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('PENDING_REVIEW')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    statusFilter === 'PENDING_REVIEW'
                      ? 'bg-white text-amber-700 font-bold shadow-xs'
                      : 'hover:text-gray-900'
                  }`}
                >
                  Pending Review ({facts.filter((f) => f.approval_status === 'PENDING_REVIEW').length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('DEPRECATED')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    statusFilter === 'DEPRECATED'
                      ? 'bg-white text-gray-700 font-bold shadow-xs'
                      : 'hover:text-gray-900'
                  }`}
                >
                  Deprecated ({facts.filter((f) => f.approval_status === 'DEPRECATED').length})
                </button>
              </div>
            </div>

            {/* Facts Grid / Cards */}
            {filteredFacts.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-500 shadow-xs space-y-3">
                <FileCheck2 className="h-8 w-8 text-gray-300 mx-auto" />
                <p className="text-sm font-semibold text-gray-700">No Approved Facts Found</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'ALL'
                    ? 'No facts match your search query or status filter.'
                    : `No verified facts registered for "${selectedBrand.name}". Add your first empirical proof.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredFacts.map((fact) => {
                  const isApproved = fact.approval_status === 'APPROVED';
                  const isPending = fact.approval_status === 'PENDING_REVIEW';
                  return (
                    <div
                      key={fact.id}
                      className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                              isApproved
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isPending
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            {isApproved ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : isPending ? (
                              <Clock className="h-3 w-3" />
                            ) : (
                              <Archive className="h-3 w-3" />
                            )}
                            {fact.approval_status}
                          </span>

                          <span className="text-[11px] text-gray-400 font-mono">
                            ID: {fact.id.slice(0, 8)}...
                          </span>
                        </div>

                        <div>
                          <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Verified Claim
                          </h5>
                          <p className="text-sm font-semibold text-gray-900 leading-relaxed">
                            "{fact.claim}"
                          </p>
                        </div>

                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5 text-xs">
                          <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-blue-600" />
                            <span>Supporting Evidence & Documentation:</span>
                          </span>
                          <p className="text-gray-600 pl-5 italic leading-relaxed">
                            {fact.evidence}
                          </p>
                        </div>

                        {fact.source && (
                          <div className="text-xs text-gray-500">
                            <span className="font-semibold text-gray-700">Source:</span> {fact.source}
                          </div>
                        )}
                      </div>

                      {canManage && (
                        <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(fact)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmFact(fact)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CREATE FACT MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200">
            <h4 className="text-base font-bold text-gray-900 mb-1">Register Approved Fact</h4>
            <p className="text-xs text-gray-500 mb-4">
              Enter the empirical claim and the corresponding verifiable evidence documentation.
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
                  Claim Statement <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formClaim}
                  onChange={(e) => setFormClaim(e.target.value)}
                  placeholder="e.g. VELORA RUN-X apparel contains 40% certified organic cotton and 60% ocean polymer."
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Evidence / Verification Reference <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={formEvidence}
                  onChange={(e) => setFormEvidence(e.target.value)}
                  placeholder="e.g. 2025 Global Organic Textile Standard (GOTS) audit cert #88219 and Ocean Plastic Certification #4092."
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Source / Citation</label>
                  <input
                    type="text"
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    placeholder="e.g. GOTS Audit Report 2025"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Approval Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="APPROVED">APPROVED (Active Truth)</option>
                    <option value="PENDING_REVIEW">PENDING_REVIEW</option>
                    <option value="DEPRECATED">DEPRECATED</option>
                  </select>
                </div>
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
                  <span>Register Fact</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FACT MODAL */}
      {editModalFact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200">
            <h4 className="text-base font-bold text-gray-900 mb-1">Edit Approved Fact</h4>
            <p className="text-xs text-gray-500 mb-4">Update the claim, evidence citation, or status.</p>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Claim Statement <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formClaim}
                  onChange={(e) => setFormClaim(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Evidence / Verification Reference <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={formEvidence}
                  onChange={(e) => setFormEvidence(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Source / Citation</label>
                  <input
                    type="text"
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Approval Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="APPROVED">APPROVED (Active Truth)</option>
                    <option value="PENDING_REVIEW">PENDING_REVIEW</option>
                    <option value="DEPRECATED">DEPRECATED</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditModalFact(null)}
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

      {/* DELETE FACT MODAL */}
      {deleteConfirmFact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-gray-900">Delete Approved Fact?</h4>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Are you sure you want to remove this verified fact from the grounding knowledge base?
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteConfirmFact(null)}
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
                <span>Yes, Delete Fact</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

