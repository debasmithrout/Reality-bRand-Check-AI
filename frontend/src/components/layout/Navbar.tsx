import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from '../common/Logo';
import { Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isHome = location.pathname === '/';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Logo />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <Link to="/" className="hover:text-blue-600 transition-colors">
            Home
          </Link>
          {isHome ? (
            <>
              <a href="#features" className="hover:text-blue-600 transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="hover:text-blue-600 transition-colors">
                How It Works
              </a>
              <a href="#about" className="hover:text-blue-600 transition-colors">
                About
              </a>
              <a href="#contact" className="hover:text-blue-600 transition-colors">
                Contact
              </a>
            </>
          ) : (
            <>
              <Link to="/#features" className="hover:text-blue-600 transition-colors">
                Features
              </Link>
              <Link to="/#how-it-works" className="hover:text-blue-600 transition-colors">
                How It Works
              </Link>
              <Link to="/#about" className="hover:text-blue-600 transition-colors">
                About
              </Link>
              <Link to="/#contact" className="hover:text-blue-600 transition-colors">
                Contact
              </Link>
            </>
          )}
          <Link to="/dashboard" className="text-blue-600 font-semibold hover:text-blue-700">
            Dashboard
          </Link>
          <Link to="/review" className="text-blue-600 font-semibold hover:text-blue-700">
            Content Review
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-medium text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md transition-colors"
          >
            Log In
          </Link>
          <Link
            to="/register"
            className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-gray-600 hover:text-gray-900 p-2"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-gray-200 bg-white px-4 pt-2 pb-6 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-gray-700 hover:text-blue-600 py-1"
          >
            Home
          </Link>
          <a
            href="/#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-gray-700 hover:text-blue-600 py-1"
          >
            Features
          </a>
          <a
            href="/#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-gray-700 hover:text-blue-600 py-1"
          >
            How It Works
          </a>
          <a
            href="/#about"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-gray-700 hover:text-blue-600 py-1"
          >
            About
          </a>
          <a
            href="/#contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-gray-700 hover:text-blue-600 py-1"
          >
            Contact
          </a>
          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-blue-600 hover:text-blue-700 py-1"
          >
            Dashboard
          </Link>
          <Link
            to="/review"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-blue-600 hover:text-blue-700 py-1"
          >
            Content Review
          </Link>
          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center font-medium text-gray-700 border border-gray-300 py-2 rounded-lg"
            >
              Log In
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center font-medium bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

