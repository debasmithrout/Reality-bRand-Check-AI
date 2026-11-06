import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileSearch, ShieldAlert, Sparkles, LogOut } from 'lucide-react';
import { Logo } from '../common/Logo';
import { useAuth } from '../../context/AuthContext';

export const DashboardSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Content Review', to: '/review', icon: FileSearch },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 border-r border-gray-200 bg-white flex flex-col min-h-screen">
      <div className="p-6 border-b border-gray-100">
        <Logo />
      </div>

      <div className="flex-1 px-4 py-6 space-y-1">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
          Platform
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}

        <div className="pt-6">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
            Governance (Future)
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 cursor-not-allowed">
              <ShieldAlert className="h-4 w-4" />
              <span>Brand Guidelines</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 cursor-not-allowed">
              <Sparkles className="h-4 w-4" />
              <span>AI Tone Rules</span>
            </div>
          </div>
        </div>
      </div>

      {/* Authenticated user session info and logout */}
      <div className="p-4 border-t border-gray-100 bg-gray-50 m-4 rounded-xl">
        <div className="text-xs font-semibold text-gray-900 truncate">
          {user?.full_name || 'Authenticated User'}
        </div>
        <div className="text-[11px] text-gray-500 truncate mt-0.5">
          {user?.email || 'Logged in'}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 w-full flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-rose-600 transition-colors cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
