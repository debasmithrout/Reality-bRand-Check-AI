import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { MetricCard } from '../components/dashboard/MetricCard';
import { SubmissionsTable } from '../components/dashboard/SubmissionsTable';
import { BrandOverviewCard } from '../components/brand/BrandOverviewCard';
import { dashboardService, formatMetrics, formatSubmissions } from '../services/dashboardService';
import { brandService } from '../services/brandService';
import { DashboardMetric, SubmissionItem, Brand } from '../types';
import {
  Layers,
  RefreshCw,
  AlertCircle,
  FileSearch,
  Building2,
  ShieldCheck,
  Sparkles,
  FileCheck2,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { ApiError } from '../services/httpClient';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Concurrently fetch summary and active brands
      const [summary, enrichedBrands] = await Promise.all([
        dashboardService.getSummary(),
        brandService.getEnrichedBrands(true),
      ]);

      setBrands(enrichedBrands);

      // Build brand ID -> name lookup map for recent submissions table
      const brandsMap: Record<string, string> = {};
      for (const b of enrichedBrands) {
        brandsMap[b.id] = b.name;
      }

      setMetrics(formatMetrics(summary));
      setSubmissions(formatSubmissions(summary.recent_submissions || [], brandsMap));
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load dashboard data. Please verify backend service status.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <DashboardHeader
        title="Brand Governance Dashboard"
        subtitle="Real-time oversight of copy compliance, violations, and active brand profiles"
      />

      <div className="p-6 sm:p-8 space-y-8 max-w-7xl">
        {/* Error State Banner with Retry */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <div className="text-sm">
                <span className="font-semibold">Dashboard Connection Notice:</span> {error}
              </div>
            </div>
            <button
              type="button"
              onClick={fetchDashboardData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Loading Spinner Indicator */}
        {loading && (
          <div className="bg-white border border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-gray-500 shadow-xs">
            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mb-3" />
            <p className="text-sm font-medium text-gray-700">Loading Governance Dashboard...</p>
            <p className="text-xs text-gray-400 mt-1">Fetching real-time metrics and brand profiles</p>
          </div>
        )}

        {/* Dashboard Content (Rendered when loaded and not errored, or with baseline) */}
        {!loading && !error && (
          <>
            {/* Quick Action Navigation Bar */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                  Quick Actions:
                </span>
                <Link
                  to="/review"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                >
                  <FileSearch className="h-3.5 w-3.5" />
                  <span>Audit Marketing Copy</span>
                </Link>
                <Link
                  to="/brands"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                >
                  <Building2 className="h-3.5 w-3.5 text-blue-600" />
                  <span>Manage Brand Profiles</span>
                </Link>
                <Link
                  to="/guidelines"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                  <span>Guidelines</span>
                </Link>
                <Link
                  to="/tone-rules"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  <span>AI Tone Rules</span>
                </Link>
                <Link
                  to="/facts"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                >
                  <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Truth Facts</span>
                </Link>
              </div>

              <button
                type="button"
                onClick={fetchDashboardData}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
                title="Refresh dashboard metrics"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* Overview Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {metrics.map((metric, idx) => (
                <MetricCard key={idx} metric={metric} />
              ))}
            </div>

            {/* Submissions Table */}
            <SubmissionsTable submissions={submissions} isLoading={loading} />

            {/* Brand Overview Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">Configured Brand Guidelines</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 font-medium">
                    {brands.length} {brands.length === 1 ? 'Profile' : 'Profiles'} in Workspace
                  </span>
                  <Link
                    to="/brands"
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    <span>Manage All Brands</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {brands.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500 shadow-xs space-y-3">
                  <Layers className="h-8 w-8 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">No brand profiles found</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                      No active brand guidelines are configured for your workspace yet. Create a brand to activate compliance checks.
                    </p>
                  </div>
                  <Link
                    to="/brands"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Brand Profile</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {brands.map((brand) => (
                    <BrandOverviewCard key={brand.id} brand={brand} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

