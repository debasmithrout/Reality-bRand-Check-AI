import React from 'react';
import { Bell, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ title, subtitle }) => {
  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 sm:px-8 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Environment Pill */}
        <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
          Demo Mode (Sample Data)
        </span>

        {/* Action Link */}
        <Link
          to="/review"
          className="text-xs sm:text-sm font-medium bg-blue-600 text-white px-3.5 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          + New Content Review
        </Link>

        {/* Notifications mock icon */}
        <button
          type="button"
          title="Notifications (Demo)"
          className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* Demo user profile avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-xs">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-medium text-gray-800">Reviewer Demo</div>
            <div className="text-[10px] text-gray-500">demo@realitybrand.ai</div>
          </div>
        </div>
      </div>
    </header>
  );
};

