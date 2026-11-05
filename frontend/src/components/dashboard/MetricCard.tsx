import React from 'react';
import { DashboardMetric } from '../../types';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  metric: DashboardMetric;
}

export const MetricCard: React.FC<MetricCardProps> = ({ metric }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">{metric.title}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">{metric.value}</span>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs">
        {metric.isPositive ? (
          <span className="inline-flex items-center text-emerald-600 font-semibold gap-0.5">
            <TrendingUp className="h-3.5 w-3.5" />
            {metric.change}
          </span>
        ) : (
          <span className="inline-flex items-center text-rose-600 font-semibold gap-0.5">
            <TrendingDown className="h-3.5 w-3.5" />
            {metric.change}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">{metric.description}</p>
    </div>
  );
};

