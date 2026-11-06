import React from 'react';
import { Logo } from '../common/Logo';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 text-gray-600 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Logo />
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              Verify Your Brand. Before the World Sees It. Automated brand compliance, terminology governance, and tone alignment.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-900 mb-3">Product</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="hover:text-blue-600 transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-blue-600 transition-colors">How It Works</a></li>
              <li><span className="text-gray-400">Roadmap (Coming soon)</span></li>
              <li><span className="text-gray-400">FastAPI API Docs</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-900 mb-3">Governance</h4>
            <ul className="space-y-2">
              <li><span className="text-gray-500">Tone of Voice Guidelines</span></li>
              <li><span className="text-gray-500">Terminology Blacklists</span></li>
              <li><span className="text-gray-500">Legal Disclaimers Engine</span></li>
              <li><span className="text-gray-500">Competitor Fact Checks</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-900 mb-3">Project</h4>
            <ul className="space-y-2">
              <li><span className="text-gray-600 font-medium">CodeNexus India 2026</span></li>
              <li><span className="text-gray-500">Status: Frontend Foundation</span></li>
              <li><span className="text-gray-500">Environment: Demo / Development</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} Reality bRand Check AI. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="text-gray-400">Confidential prototype for CodeNexus India 2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

