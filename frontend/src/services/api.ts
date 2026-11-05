import { DEMO_BRANDS, DEMO_METRICS, DEMO_SUBMISSIONS, SAMPLE_ANALYSIS_PRESETS } from '../utils/mockData';
import { Brand, ContentReviewResult, DashboardMetric, SubmissionItem } from '../types';

/**
 * Service mock layer designed for seamless future swap with FastAPI endpoints.
 * Note: Uses client-side mock data with clear demo labels as requested.
 */
export const brandService = {
  getBrands: async (): Promise<Brand[]> => {
    return Promise.resolve(DEMO_BRANDS);
  },
  getBrandById: async (id: string): Promise<Brand | undefined> => {
    return Promise.resolve(DEMO_BRANDS.find((b) => b.id === id));
  },
};

export const dashboardService = {
  getMetrics: async (): Promise<DashboardMetric[]> => {
    return Promise.resolve(DEMO_METRICS);
  },
  getRecentSubmissions: async (): Promise<SubmissionItem[]> => {
    return Promise.resolve(DEMO_SUBMISSIONS);
  },
};

export const reviewService = {
  analyzeContent: async (content: string, brandId: string): Promise<ContentReviewResult> => {
    // Simulated demo delay to represent an analysis request
    await new Promise((resolve) => setTimeout(resolve, 600));

    const brand = DEMO_BRANDS.find((b) => b.id === brandId) || DEMO_BRANDS[0];
    const defaultResult = SAMPLE_ANALYSIS_PRESETS.default;

    return {
      ...defaultResult,
      brandId: brand.id,
      content,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (Demo Analysis)',
    };
  },
};

