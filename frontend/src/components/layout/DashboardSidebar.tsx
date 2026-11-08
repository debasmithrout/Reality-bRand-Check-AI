import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSearch,
  Building2,
  ShieldCheck,
  Sparkles,
  FileCheck2,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { useAuth } from '../../context/AuthContext';

export const DashboardSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const platformItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Content Review', to: '/review', icon: FileSearch },
  ];

  const governanceItems = [
    { label: 'Brand Profiles', to: '/brands', icon: Building2 },
    { label: 'Brand Guidelines', to: '/guidelines', icon: ShieldCheck },
    { label: 'AI Tone Rules', to: '/tone-rules', icon: Sparkles },
    { label: 'Approved Facts', to: '/facts', icon: FileCheck2 },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleBadgeColor =
    user?.role === 'ADMIN'
      ? 'bg-purple-50 text-purple-700 border-purple-200'
      : user?.role === 'REVIEWER'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-blue-50 text-blue-700 border-blue-200';

  return (
    <aside className="w-64 border-r border-gray-200 bg-white flex flex-col min-h-screen shrink-0">
      <div className="p-6 border-b border-gray-100">
        <Logo />
      </div>

      <div className="flex-1 px-4 py-6 space-y-6">
        {/* Platform Section */}
        <div>
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
            Operations
          </div>
          <div className="space-y-1">
            {platformItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Governance Section */}
        <div>
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
            Brand Governance
          </div>
          <div className="space-y-1">
            {governanceItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>

      {/* Authenticated user session info and logout */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/80 m-4 rounded-2xl">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${roleBadgeColor}`}
          >
            <UserCheck className="h-3 w-3" />
            {user?.role || 'USER'}
          </span>
          <span className="text-[10px] text-gray-400 font-mono">
            {user?.workspace_id || 'default'}
          </span>
        </div>

        <div className="text-xs font-bold text-gray-900 truncate">
          {user?.full_name || 'Authenticated User'}
        </div>
        <div className="text-[11px] text-gray-500 truncate mt-0.5">
          {user?.email || 'Logged in'}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-rose-600 hover:bg-rose-50 py-1.5 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-100"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
