export const formatScore = (score: number | null | undefined): string => {
  if (score === null || score === undefined) return 'N/A';
  return `${Math.round(score)}/100`;
};

export const getScoreBadgeColor = (score: number | null | undefined): string => {
  if (score === null || score === undefined) return 'bg-gray-50 text-gray-700 border-gray-200';
  if (score >= 85) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (score >= 70) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
};

export const getSeverityBadgeColor = (severity: string): string => {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
    case 'HIGH':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'WARNING':
    case 'MEDIUM':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'INFO':
    case 'LOW':
    default:
      return 'bg-blue-50 text-blue-700 border-blue-200';
  }
};

export const formatRelativeTime = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  } catch {
    return dateStr;
  }
};
