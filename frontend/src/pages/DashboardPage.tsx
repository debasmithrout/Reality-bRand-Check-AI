import React, { useState, useEffect, useCallback } from 'react';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { MetricCard } from '../components/dashboard/MetricCard';
import { SubmissionsTable } from '../components/dashboard/SubmissionsTable';
import { BrandOverviewCard } from '../components/brand/BrandOverviewCard';
import { dashboardService, formatMetrics, formatSubmissions } from '../services/dashboardService';
import { brandService } from '../services/brandService';
import { DashboardMetric, SubmissionItem, Brand } from '../types';
import { Layers, RefreshCw, AlertCircle } from 'lucide-react';
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
                <span className="text-xs text-gray-500 font-medium">
                  {brands.length} {brands.length === 1 ? 'Profile' : 'Profiles'} in Workspace
                </span>
              </div>

              {brands.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500 shadow-xs">
                  <Layers className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700">No brand profiles found</p>
                  <p className="text-xs text-gray-500 mt-1">
                    No active brand guidelines are configured for your workspace yet.
                  </p>
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

