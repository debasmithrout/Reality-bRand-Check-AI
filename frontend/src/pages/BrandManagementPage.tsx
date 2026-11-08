import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { brandService } from '../services/brandService';
import { BrandResponse, BrandCreatePayload, BrandUpdatePayload } from '../types';
import { ApiError } from '../services/httpClient';
import {
  Building2,
  Plus,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Edit2,
  Trash2,
  ShieldCheck,
  Sparkles,
  FileCheck2,
  CheckCircle2,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const BrandManagementPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [brands, setBrands] = useState<BrandResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [editModalBrand, setEditModalBrand] = useState<BrandResponse | null>(null);
  const [deleteConfirmBrand, setDeleteConfirmBrand] = useState<BrandResponse | null>(null);

  // Form inputs for Create / Edit
  const [formName, setFormName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formIndustry, setFormIndustry] = useState<string>('');
  const [formWebsite, setFormWebsite] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isReviewer = user?.role === 'REVIEWER';
  const canManage = user?.role === 'ADMIN' || user?.role === 'EDITOR';

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await brandService.getBrands();
      setBrands(data || []);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load brand profiles for this workspace.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const openCreateModal = () => {
    setFormName('');
    setFormDescription('');
    setFormIndustry('');
    setFormWebsite('');
    setFormIsActive(true);
    setFormError(null);
    setCreateModalOpen(true);
  };

  const openEditModal = (brand: BrandResponse) => {
    setEditModalBrand(brand);
    setFormName(brand.name);
    setFormDescription(brand.description || '');
    setFormIndustry(brand.industry || '');
    setFormWebsite(brand.website || '');
    setFormIsActive(brand.is_active);
    setFormError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Brand Name is required.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
    try {
      const payload: BrandCreatePayload = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        industry: formIndustry.trim() || undefined,
        website: formWebsite.trim() || undefined,
      };
      await brandService.createBrand(payload);
      setCreateModalOpen(false);
      setActionSuccess(`Brand profile "${payload.name}" created successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchBrands();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create brand.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalBrand) return;
    if (!formName.trim()) {
      setFormError('Brand Name is required.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
    try {
      const payload: BrandUpdatePayload = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        industry: formIndustry.trim() || undefined,
        website: formWebsite.trim() || undefined,
        is_active: formIsActive,
      };
      await brandService.updateBrand(editModalBrand.id, payload);
      setEditModalBrand(null);
      setActionSuccess(`Brand "${payload.name}" updated successfully.`);
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchBrands();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update brand.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmBrand) return;
    setFormSubmitting(true);
    try {
      await brandService.deleteBrand(deleteConfirmBrand.id);
      const deletedName = deleteConfirmBrand.name;
      setDeleteConfirmBrand(null);
      setActionSuccess(`Brand "${deletedName}" and its governance rules were deleted.`);
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchBrands();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete brand.');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <DashboardHeader
        title="Brand Profiles & Governance"
        subtitle="Manage brand identities, guidelines, tone rules, and verified facts for your workspace"
      />

      <div className="p-6 sm:p-8 space-y-6 max-w-7xl">
        {/* Action / Success Banner */}
        {actionSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-800 text-sm shadow-xs">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
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
              onClick={fetchBrands}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Controls Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">Workspace Brand Profiles</h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Each brand encapsulates custom guidelines, prohibited keywords, and empirical ground truth.
            </p>
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
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Create Brand Profile</span>
              </button>
            )}

            <button
              type="button"
              onClick={fetchBrands}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              title="Refresh brands"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500 shadow-xs">
            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">Loading Brand Profiles...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && brands.length === 0 && (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center text-gray-600 shadow-xs max-w-xl mx-auto space-y-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Layers className="h-7 w-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900">No Brand Profiles Configured</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Create your first brand profile to establish voice tone parameters, prohibited terminology, and verified evidence.
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Create First Brand Profile</span>
              </button>
            )}
          </div>
        )}

        {/* Brand Grid */}
        {!loading && brands.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className={`bg-white border rounded-2xl p-6 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                  brand.is_active ? 'border-gray-200' : 'border-gray-200 bg-gray-50/50 opacity-80'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold text-gray-900">{brand.name}</h4>
                      {brand.industry && (
                        <span className="inline-block mt-1 text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-200">
                          {brand.industry}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                        brand.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}
                    >
                      {brand.is_active ? 'Active Profile' : 'Inactive'}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                    {brand.description || 'No description provided for this brand profile.'}
                  </p>

                  {brand.website && (
                    <a
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium break-all"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      <span>{brand.website}</span>
                    </a>
                  )}

                  {/* Governance Hub Shortcuts */}
                  <div className="pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center text-xs">
                    <button
                      type="button"
                      onClick={() => navigate(`/guidelines?brandId=${brand.id}`)}
                      className="p-2 bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 rounded-lg transition-colors flex flex-col items-center gap-1 border border-blue-100"
                      title="Configure Guidelines"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span className="text-[11px] font-medium">Guidelines</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/tone-rules?brandId=${brand.id}`)}
                      className="p-2 bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-700 rounded-lg transition-colors flex flex-col items-center gap-1 border border-indigo-100"
                      title="Manage AI Tone Rules"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span className="text-[11px] font-medium">Tone Rules</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/facts?brandId=${brand.id}`)}
                      className="p-2 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-700 rounded-lg transition-colors flex flex-col items-center gap-1 border border-emerald-100"
                      title="Verified Knowledge Facts"
                    >
                      <FileCheck2 className="h-4 w-4" />
                      <span className="text-[11px] font-medium">Facts Hub</span>
                    </button>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => navigate(`/review?brandId=${brand.id}`)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    <span>Audit Content</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(brand)}
                        className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit brand profile"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmBrand(brand)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete brand"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE BRAND MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200">
            <h4 className="text-base font-bold text-gray-900 mb-1">Create Brand Profile</h4>
            <p className="text-xs text-gray-500 mb-4">
              Enter your brand identity details. Guidelines and tone rules can be configured after creation.
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
                  Brand Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. VELORA Sustainable Couture"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Industry Vertical</label>
                <input
                  type="text"
                  value={formIndustry}
                  onChange={(e) => setFormIndustry(e.target.value)}
                  placeholder="e.g. Sustainable Luxury Fashion, Fintech, SaaS"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Official Website</label>
                <input
                  type="url"
                  value={formWebsite}
                  onChange={(e) => setFormWebsite(e.target.value)}
                  placeholder="https://velora-couture.com"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Brand Overview</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Concise summary of brand positioning, values, and offerings..."
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={formSubmitting}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {formSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Create Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BRAND MODAL */}
      {editModalBrand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200">
            <h4 className="text-base font-bold text-gray-900 mb-1">Edit Brand Profile</h4>
            <p className="text-xs text-gray-500 mb-4">Update brand identity details or active status.</p>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Brand Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Industry Vertical</label>
                <input
                  type="text"
                  value={formIndustry}
                  onChange={(e) => setFormIndustry(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Official Website</label>
                <input
                  type="url"
                  value={formWebsite}
                  onChange={(e) => setFormWebsite(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Brand Overview</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-is-active"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="edit-is-active" className="font-semibold text-gray-700">
                  Brand profile is active (available for content reviews)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditModalBrand(null)}
                  disabled={formSubmitting}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {formSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE BRAND CONFIRMATION MODAL */}
      {deleteConfirmBrand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-gray-900">Delete Brand Profile?</h4>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Are you sure you want to delete <strong>"{deleteConfirmBrand.name}"</strong>? This will permanently remove all associated guidelines, tone rules, and verified facts. This action cannot be undone.
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteConfirmBrand(null)}
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
                <span>Yes, Delete Brand</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
