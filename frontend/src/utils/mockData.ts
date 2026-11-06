import { Brand, SubmissionItem, DashboardMetric, ContentReviewResult } from '../types';

export const DEMO_BRANDS: Brand[] = [
  {
    id: 'b-1',
    name: 'Nexus Cloud Technologies',
    tagline: 'Reliable Cloud for the Modern Enterprise',
    voiceTone: 'Professional, forward-looking, and authoritative',
    prohibitedTerms: ['cheap', 'guaranteed 100% uptime', 'unhackable'],
    mandatoryDisclaimers: ['Subject to enterprise SLA terms.'],
  },
  {
    id: 'b-2',
    name: 'Aura Health & Wellness',
    tagline: 'Mindful Living, Natural Balance',
    voiceTone: 'Empathetic, scientifically backed, calming',
    prohibitedTerms: ['miracle cure', 'instant weight loss', 'toxic chemicals'],
    mandatoryDisclaimers: ['Statements not evaluated by medical boards.'],
  },
  {
    id: 'b-3',
    name: 'Vortex FinTech',
    tagline: 'Smart Money Moves',
    voiceTone: 'Transparent, crisp, security-conscious',
    prohibitedTerms: ['risk-free investment', 'double your money', 'zero risk'],
    mandatoryDisclaimers: ['Capital at risk. Past performance is not indicative of future returns.'],
  },
];

export const DEMO_METRICS: DashboardMetric[] = [
  {
    title: 'Verified Submissions',
    value: '1,284',
    change: '+14% this month',
    isPositive: true,
    description: 'Total copy pieces scanned across channels',
  },
  {
    title: 'Brand Compliance Rate',
    value: '94.2%',
    change: '+3.1% vs last month',
    isPositive: true,
    description: 'Guidelines adherence without manual override',
  },
  {
    title: 'Terminology Violations Caught',
    value: '89',
    change: '-12% this week',
    isPositive: true,
    description: 'Prohibited terms caught before publication',
  },
  {
    title: 'Active Brand Profiles',
    value: '3',
    change: 'All profiles synchronized',
    isPositive: true,
    description: 'Configured guidelines and voice parameters',
  },
];

export const DEMO_SUBMISSIONS: SubmissionItem[] = [
  {
    id: 'SUB-1049',
    title: 'Q3 Enterprise Product Launch Email Campaign',
    brand: 'Nexus Cloud Technologies',
    channel: 'Email Marketing',
    score: 96,
    status: 'Approved',
    submittedAt: 'Today at 10:30 AM',
  },
  {
    id: 'SUB-1048',
    title: 'Instagram Seasonal Wellness Routine Post',
    brand: 'Aura Health & Wellness',
    channel: 'Social Media',
    score: 72,
    status: 'Needs Revision',
    submittedAt: 'Yesterday at 4:15 PM',
  },
  {
    id: 'SUB-1047',
    title: 'Wealth Management App Feature Landing Copy',
    brand: 'Vortex FinTech',
    channel: 'Web Landing Page',
    score: 88,
    status: 'Approved',
    submittedAt: 'Yesterday at 2:00 PM',
  },
  {
    id: 'SUB-1046',
    title: 'LinkedIn Thought Leadership Article - Cloud Security',
    brand: 'Nexus Cloud Technologies',
    channel: 'Content Marketing',
    score: 65,
    status: 'Needs Revision',
    submittedAt: 'Nov 3, 2026',
  },
  {
    id: 'SUB-1045',
    title: 'Press Release: Aura Natural Herbal Extract Series',
    brand: 'Aura Health & Wellness',
    channel: 'PR Wire',
    score: 91,
    status: 'Approved',
    submittedAt: 'Nov 2, 2026',
  },
];

export const SAMPLE_ANALYSIS_PRESETS: Record<string, ContentReviewResult> = {
  default: {
    id: 'REV-SAMPLE-01',
    brandId: 'b-1',
    content: 'Nexus Cloud offers cheap enterprise servers with guaranteed 100% uptime for all operations.',
    overallScore: 68,
    status: 'needs_revision',
    findings: [
      {
        id: 'f-1',
        type: 'terminology',
        severity: 'high',
        title: 'Prohibited Term Detected',
        originalText: 'cheap',
        suggestedText: 'cost-effective / competitive',
        explanation: 'The word "cheap" conflicts with the premium enterprise brand identity of Nexus Cloud.',
      },
      {
        id: 'f-2',
        type: 'claim',
        severity: 'high',
        title: 'Unsubstantiated High-Risk Claim',
        originalText: 'guaranteed 100% uptime',
        suggestedText: 'industry-leading 99.99% uptime SLA',
        explanation: 'Absolute uptime guarantees expose the brand to regulatory and contract liability.',
      },
      {
        id: 'f-3',
        type: 'tone',
        severity: 'medium',
        title: 'Voice & Tone Alignment',
        originalText: 'for all operations',
        suggestedText: 'engineered to scale mission-critical workloads seamlessly',
        explanation: 'Tone should be authoritative and enterprise-grade.',
      },
    ],
    suggestedCorrection:
      'Nexus Cloud offers cost-effective enterprise infrastructure with an industry-leading 99.99% uptime SLA, engineered to scale mission-critical workloads seamlessly. Subject to enterprise SLA terms.',
    createdAt: 'Just now (Demo Analysis)',
  },
};

