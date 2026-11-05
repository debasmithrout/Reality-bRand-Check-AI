import React from 'react';
import { Brand } from '../../types';
import { ShieldCheck, BookOpen, Ban } from 'lucide-react';

interface BrandOverviewCardProps {
  brand: Brand;
}

export const BrandOverviewCard: React.FC<BrandOverviewCardProps> = ({ brand }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-blue-200 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-bold text-gray-900 text-base">{brand.name}</h4>
          <p className="text-xs text-gray-500 italic mt-0.5">"{brand.tagline}"</p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
          Active Profile
        </span>
      </div>

      <div className="mt-4 space-y-2.5 text-xs">
        <div>
          <div className="flex items-center gap-1.5 font-semibold text-gray-700 mb-1">
            <BookOpen className="h-3.5 w-3.5 text-blue-600" />
            <span>Tone of Voice:</span>
          </div>
          <p className="text-gray-600 pl-5">{brand.voiceTone}</p>
        </div>

        <div>
          <div className="flex items-center gap-1.5 font-semibold text-gray-700 mb-1">
            <Ban className="h-3.5 w-3.5 text-rose-500" />
            <span>Prohibited Terms:</span>
          </div>
          <div className="flex flex-wrap gap-1.5 pl-5">
            {brand.prohibitedTerms.map((term, i) => (
              <span
                key={i}
                className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-[11px] font-mono border border-rose-100"
              >
                {term}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 font-semibold text-gray-700 mb-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Mandatory Disclaimers:</span>
          </div>
          <p className="text-gray-600 pl-5 text-[11px]">
            {brand.mandatoryDisclaimers.join(', ')}
          </p>
        </div>
      </div>
    </div>
  );
};

