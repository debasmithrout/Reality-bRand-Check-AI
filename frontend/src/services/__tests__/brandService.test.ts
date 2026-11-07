import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  brandService,
  extractToneOfVoice,
  extractDisclaimers,
  enrichBrand,
} from '../brandService';
import { BrandResponse, GuidelineResponse, TerminologyResponse } from '../../types';

describe('brandService and helper functions', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    vi.restoreAllMocks();
    for (const key in store) delete store[key];

    const mockLocalStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => {
        store[key] = val;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const key in store) delete store[key];
      },
    };
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  describe('extractToneOfVoice', () => {
    it('returns fallback when guidelines or tone_of_voice is missing', () => {
      expect(extractToneOfVoice(null, 'Custom Fallback')).toBe('Custom Fallback');
      expect(extractToneOfVoice({ id: '1', brand_id: 'b1', created_at: '', updated_at: '' })).toBe(
        'Tone parameters not configured yet'
      );
    });

    it('returns string when tone_of_voice is a string', () => {
      const g: GuidelineResponse = {
        id: '1',
        brand_id: 'b1',
        tone_of_voice: 'Direct, crisp and authoritative',
        created_at: '',
        updated_at: '',
      };
      expect(extractToneOfVoice(g)).toBe('Direct, crisp and authoritative');
    });

    it('extracts dos when tone_of_voice is an object with dos array', () => {
      const g: GuidelineResponse = {
        id: '1',
        brand_id: 'b1',
        tone_of_voice: {
          dos: ['Be clear', 'Use active voice'],
          donts: ['Avoid jargon'],
        },
        created_at: '',
        updated_at: '',
      };
      expect(extractToneOfVoice(g)).toBe('Do: Be clear, Use active voice');
    });
  });

  describe('extractDisclaimers', () => {
    it('returns empty array when guidelines are null', () => {
      expect(extractDisclaimers(null)).toEqual([]);
    });

    it('extracts additional_guidelines string', () => {
      const g: GuidelineResponse = {
        id: '1',
        brand_id: 'b1',
        additional_guidelines: 'Enterprise SLA applies to all tiers.',
        created_at: '',
        updated_at: '',
      };
      expect(extractDisclaimers(g)).toEqual(['Enterprise SLA applies to all tiers.']);
    });

    it('extracts disclaimers array from messaging_rules', () => {
      const g: GuidelineResponse = {
        id: '1',
        brand_id: 'b1',
        messaging_rules: {
          disclaimers: ['Past performance not indicative of future returns.'],
        },
        created_at: '',
        updated_at: '',
      };
      expect(extractDisclaimers(g)).toEqual([
        'Past performance not indicative of future returns.',
      ]);
    });
  });

  describe('enrichBrand', () => {
    const rawBrand: BrandResponse = {
      id: 'brand-101',
      workspace_id: 'ws-1',
      name: 'CyberShield AI',
      description: 'Enterprise threat protection',
      industry: 'Cybersecurity',
      website: 'https://cybershield.test',
      is_active: true,
      created_by: 'user-1',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    };

    const guidelines: GuidelineResponse = {
      id: 'g-1',
      brand_id: 'brand-101',
      tone_of_voice: 'Authoritative, technical',
      additional_guidelines: 'Subject to enterprise licensing.',
      created_at: '',
      updated_at: '',
    };

    const terms: TerminologyResponse[] = [
      {
        id: 't-1',
        brand_id: 'brand-101',
        term: 'unhackable',
        term_type: 'PROHIBITED',
        is_case_sensitive: false,
        created_at: '',
        updated_at: '',
      },
      {
        id: 't-2',
        brand_id: 'brand-101',
        term: 'zero trust',
        term_type: 'PREFERRED',
        is_case_sensitive: false,
        created_at: '',
        updated_at: '',
      },
    ];

    it('transforms raw brand, guidelines and terms into Brand UI model', () => {
      const enriched = enrichBrand(rawBrand, guidelines, terms);
      expect(enriched.id).toBe('brand-101');
      expect(enriched.name).toBe('CyberShield AI');
      expect(enriched.tagline).toBe('Enterprise threat protection');
      expect(enriched.voiceTone).toBe('Authoritative, technical');
      expect(enriched.prohibitedTerms).toEqual(['unhackable']);
      expect(enriched.mandatoryDisclaimers).toEqual(['Subject to enterprise licensing.']);
      expect(enriched.isActive).toBe(true);
    });
  });

  describe('API service calls', () => {
    it('getBrands calls GET /brands and passes is_active query param', async () => {
      const fakeBrands: BrandResponse[] = [
        {
          id: 'b1',
          workspace_id: 'ws1',
          name: 'VELORA',
          is_active: true,
          created_by: 'u1',
          created_at: '',
          updated_at: '',
        },
      ];

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: fakeBrands,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await brandService.getBrands(true);
      expect(res).toEqual(fakeBrands);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/brands?is_active=true'),
        expect.any(Object)
      );
    });

    it('getBrandById calls GET /brands/:id', async () => {
      const fakeBrand: BrandResponse = {
        id: 'b1',
        workspace_id: 'ws1',
        name: 'VELORA',
        is_active: true,
        created_by: 'u1',
        created_at: '',
        updated_at: '',
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: fakeBrand,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await brandService.getBrandById('b1');
      expect(res).toEqual(fakeBrand);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/brands/b1'),
        expect.any(Object)
      );
    });

    it('getGuidelines calls GET /brands/:id/guidelines', async () => {
      const fakeGuidelines: GuidelineResponse = {
        id: 'g1',
        brand_id: 'b1',
        tone_of_voice: 'Empathetic',
        created_at: '',
        updated_at: '',
      };

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: fakeGuidelines,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await brandService.getGuidelines('b1');
      expect(res).toEqual(fakeGuidelines);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/brands/b1/guidelines'),
        expect.any(Object)
      );
    });

    it('getTerminology calls GET /brands/:id/terminology with term_type filter', async () => {
      const fakeTerms: TerminologyResponse[] = [
        {
          id: 't1',
          brand_id: 'b1',
          term: 'cheap',
          term_type: 'PROHIBITED',
          is_case_sensitive: false,
          created_at: '',
          updated_at: '',
        },
      ];

      vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: fakeTerms,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const res = await brandService.getTerminology('b1', 'PROHIBITED');
      expect(res).toEqual(fakeTerms);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/brands/b1/terminology?term_type=PROHIBITED'),
        expect.any(Object)
      );
    });
  });
});
