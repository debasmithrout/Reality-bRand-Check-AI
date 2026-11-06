import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { MetricCard } from '../components/dashboard/MetricCard';
import { SubmissionsTable } from '../components/dashboard/SubmissionsTable';
import { BrandOverviewCard } from '../components/brand/BrandOverviewCard';
import { dashboardService, brandService } from '../services/api';
import { DashboardMetric, SubmissionItem, Brand } from '../types';
import { Alert } from '../components/common/Alert';
import { Layers } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    dashboardService.getMetrics().then(setMetrics);
    dashboardService.getRecentSubmissions().then(setSubmissions);
    brandService.getBrands().then(setBrands);
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <DashboardHeader
        title="Brand Governance Dashboard"
        subtitle="Real-time oversight of copy compliance, violations, and active brand profiles"
      />

      <div className="p-6 sm:p-8 space-y-8 max-w-7xl">
        {/* Transparent Banner */}
        <Alert type="info" title="Sample Dashboard Environment">
          This dashboard displays simulated brand metrics, recent audit records, and mock profiles for CodeNexus India 2026. Real-time data will stream from FastAPI backend services once connected.
        </Alert>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {metrics.map((metric, idx) => (
            <MetricCard key={idx} metric={metric} />
          ))}
        </div>

        {/* Submissions Table */}
        <SubmissionsTable submissions={submissions} />

        {/* Brand Overview Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Configured Brand Guidelines</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {brands.map((brand) => (
              <BrandOverviewCard key={brand.id} brand={brand} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

