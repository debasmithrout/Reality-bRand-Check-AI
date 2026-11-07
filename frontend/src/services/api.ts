import { SAMPLE_ANALYSIS_PRESETS } from '../utils/mockData';
import { ContentReviewResult } from '../types';

export { brandService } from './brandService';
export { dashboardService } from './dashboardService';

/**
 * Review service for AI content analysis.
 * NOTE: Live AI submission & analysis is scheduled for Phase 4C.
 * This service currently provides structured demo findings for UI preview.
 */
export const reviewService = {
  analyzeContent: async (content: string, brandId: string): Promise<ContentReviewResult> => {
    // Simulated processing delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    const defaultResult = SAMPLE_ANALYSIS_PRESETS.default;

    return {
      ...defaultResult,
      brandId,
      content,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (Demo Analysis)',
    };
  },
};
