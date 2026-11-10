import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  showTagline?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', showTagline = false }) => {
  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 font-bold tracking-tight text-gray-900 ${className}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
        <ShieldCheck className="h-5 w-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-lg leading-tight">
          Reality <span className="text-blue-600 font-extrabold">bRand</span> Check
        </span>
        {showTagline && (
          <span className="text-[10px] text-gray-500 font-normal">Verify Your Brand. Before the World Sees It.</span>
        )}
      </div>
    </Link>
  );
};

