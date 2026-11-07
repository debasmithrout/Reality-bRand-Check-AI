/**
 * Reality bRand Check AI - Brand Management Service
 * Communicates with FastAPI backend /api/v1/brands, guidelines, and terminology endpoints.
 */

import { httpClient } from './httpClient';
import {
  Brand,
  BrandResponse,
  GuidelineResponse,
  TerminologyResponse,
  TerminologyType,
} from '../types';

/**
 * Safely extracts a readable Tone of Voice string from diverse guideline payload formats.
 */
export function extractToneOfVoice(
  guidelines?: GuidelineResponse | null,
  fallback?: string
): string {
  if (!guidelines || !guidelines.tone_of_voice) {
    return fallback || 'Tone parameters not configured yet';
  }

  const tov = guidelines.tone_of_voice;

  if (typeof tov === 'string') {
    return tov;
  }

  if (typeof tov === 'object' && tov !== null) {
    if (Array.isArray(tov.dos) && tov.dos.length > 0) {
      return `Do: ${tov.dos.join(', ')}`;
    }
    if (Array.isArray(tov)) {
      return tov.join(', ');
    }
    try {
      return Object.entries(tov)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join(' | ');
    } catch {
      return JSON.stringify(tov);
    }
  }

  return String(tov);
}

/**
 * Extracts disclaimers or mandatory requirements from brand guidelines.
 */
export function extractDisclaimers(guidelines?: GuidelineResponse | null): string[] {
  if (!guidelines) return [];

  const disclaimers: string[] = [];

  if (guidelines.additional_guidelines && typeof guidelines.additional_guidelines === 'string') {
    disclaimers.push(guidelines.additional_guidelines);
  }

  if (guidelines.messaging_rules && typeof guidelines.messaging_rules === 'object') {
    const rules = guidelines.messaging_rules as Record<string, any>;
    if (Array.isArray(rules.disclaimers)) {
      disclaimers.push(...rules.disclaimers.filter(Boolean));
    } else if (typeof rules.tagline === 'string') {
      disclaimers.push(`Pillars: ${rules.tagline}`);
    }
  }

  return disclaimers;
}

/**
 * Enriches raw BrandResponse with its guidelines and terminology into the Brand UI model.
 */
export function enrichBrand(
  rawBrand: BrandResponse,
  guidelines?: GuidelineResponse | null,
  terms: TerminologyResponse[] = []
): Brand {
  const prohibitedTerms = terms
    .filter((t) => t.term_type === 'PROHIBITED')
    .map((t) => t.term);

  return {
    id: rawBrand.id,
    name: rawBrand.name,
    tagline: rawBrand.description || rawBrand.industry || 'Enterprise Brand Profile',
    voiceTone: extractToneOfVoice(guidelines, rawBrand.description || undefined),
    prohibitedTerms,
    mandatoryDisclaimers: extractDisclaimers(guidelines),
    industry: rawBrand.industry || undefined,
    website: rawBrand.website || undefined,
    workspaceId: rawBrand.workspace_id,
    isActive: rawBrand.is_active,
  };
}

export const brandService = {
  /**
   * List all brands in the authenticated user's workspace.
   */
  async getBrands(isActive?: boolean): Promise<BrandResponse[]> {
    const query = isActive !== undefined ? `?is_active=${isActive}` : '';
    return httpClient.get<BrandResponse[]>(`/brands${query}`);
  },

  /**
   * Get brand details by brand ID.
   */
  async getBrandById(brandId: string): Promise<BrandResponse> {
    return httpClient.get<BrandResponse>(`/brands/${brandId}`);
  },

  /**
   * Retrieve guidelines for a brand.
   */
  async getGuidelines(brandId: string): Promise<GuidelineResponse | null> {
    return httpClient.get<GuidelineResponse | null>(`/brands/${brandId}/guidelines`);
  },

  /**
   * List terminology rules for a brand, optionally filtered by term type.
   */
  async getTerminology(
    brandId: string,
    termType?: TerminologyType
  ): Promise<TerminologyResponse[]> {
    const query = termType ? `?term_type=${encodeURIComponent(termType)}` : '';
    return httpClient.get<TerminologyResponse[]>(`/brands/${brandId}/terminology${query}`);
  },

  /**
   * Fetch all brands enriched with their guidelines and terminology rules.
   */
  async getEnrichedBrands(isActive?: boolean): Promise<Brand[]> {
    const brands = await this.getBrands(isActive);
    if (!brands || brands.length === 0) {
      return [];
    }

    const enrichedList = await Promise.all(
      brands.map(async (b) => {
        try {
          const [guidelines, terminology] = await Promise.all([
            this.getGuidelines(b.id).catch(() => null),
            this.getTerminology(b.id).catch(() => []),
          ]);
          return enrichBrand(b, guidelines, terminology);
        } catch {
          // If sub-fetches fail, return gracefully with baseline brand info
          return enrichBrand(b, null, []);
        }
      })
    );

    return enrichedList;
  },

  /**
   * Fetch single enriched brand by ID.
   */
  async getEnrichedBrand(brandId: string): Promise<Brand> {
    const [rawBrand, guidelines, terminology] = await Promise.all([
      this.getBrandById(brandId),
      this.getGuidelines(brandId).catch(() => null),
      this.getTerminology(brandId).catch(() => []),
    ]);
    return enrichBrand(rawBrand, guidelines, terminology);
  },
};

