import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import {
  ShieldCheck,
  FileText,
  AlertTriangle,
  ArrowRight,
  Sliders,
  Scale,
  Sparkles,
  Layers,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 border-b border-gray-100 bg-linear-to-b from-blue-50/40 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 mb-6">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            CodeNexus India 2026 Initiative • Prototype Preview
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight max-w-4xl mx-auto">
            Reality <span className="text-blue-600">bRand Check</span> AI
          </h1>

          <p className="mt-4 text-xl sm:text-2xl font-semibold text-gray-800 max-w-2xl mx-auto">
            Verify Your Brand. Before the World Sees It.
          </p>

          <p className="mt-6 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            An AI-powered brand governance platform that helps businesses verify marketing content against their brand guidelines, terminology, approved facts, and brand identity.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/review"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-md transition-all"
            >
              Get Started with Content Review
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-gray-100 text-gray-800 font-medium hover:bg-gray-200 transition-colors"
            >
              Explore Features
            </a>
          </div>

          {/* Hero Quick Preview Card */}
          <div className="mt-14 max-w-3xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden text-left p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-3 w-3 rounded-full bg-rose-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs font-mono text-gray-400">brand-governance-audit.live</span>
              </div>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Nexus Cloud Tech Profile
              </span>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                Audited Copy Sample
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-800 font-mono">
                "Nexus Cloud delivers <span className="bg-rose-100 text-rose-800 px-1 font-bold">cheap</span> enterprise servers with <span className="bg-amber-100 text-amber-900 px-1 font-bold">guaranteed 100% uptime</span>."
              </div>

              <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 flex items-start gap-3 mt-4 text-xs">
                <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-blue-900">Recommended Auto-Fix: </span>
                  <span className="text-blue-950">
                    "Nexus Cloud delivers cost-effective enterprise infrastructure with an industry-leading 99.99% uptime SLA."
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs uppercase font-bold tracking-widest text-blue-600 mb-2">Core Platform Features</h2>
            <p className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Total Governance Over Every Word Your Brand Publishes
            </p>
            <p className="mt-4 text-base text-gray-600">
              Eliminate off-brand slip-ups, legal liabilities, and tone inconsistencies across campaigns, PR, and social media.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Sliders className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Brand Guidelines Alignment</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Ingests your brand voice principles, style guides, and vocabulary standards to audit draft copy in real time.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Prohibited Terminology Watchdog</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Detects banned words, buzzwords, competitor naming, or misleading terms before posts ever leave the copy deck.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Scale className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Approved Facts & Claims</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Validates product claims, statistical guarantees, and legal disclaimers against certified corporate facts.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Instant Remediation Rewrites</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Doesn't just flag problems — generates context-aware, brand-compliant rewrite recommendations with one-click copy.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Multi-Brand Management</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Manage discrete guidelines, tones, and terminology restrictions for multiple sub-brands, business units, or clients.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Audit History & Analytics</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Centralized dashboard tracking submission logs, compliance trends, and frequently flagged brand violations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs uppercase font-bold tracking-widest text-blue-600 mb-2">Simple Workflow</h2>
            <p className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              How Reality bRand Check Works
            </p>
            <p className="mt-4 text-base text-gray-600">
              Three clear steps between your draft copy and confident, compliant publishing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl border border-gray-200 relative">
              <div className="text-3xl font-black text-blue-600/30 mb-2">01</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Select Brand & Enter Copy</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Choose your brand profile with predefined tone rules, prohibited terms, and disclaimers. Paste in draft copy from emails, ads, or blogs.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 relative">
              <div className="text-3xl font-black text-blue-600/30 mb-2">02</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Run Governance Audit</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                The engine evaluates text against brand personality standards, highlighting blacklisted words, overpromising statements, and tone deviations.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 relative">
              <div className="text-3xl font-black text-blue-600/30 mb-2">03</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Review & Apply Fixes</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Inspect structured findings categorized by risk level, then copy the suggested brand-safe revision ready for launch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-xs uppercase font-bold tracking-widest text-blue-600 mb-2">About The Project</h2>
            <p className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Built for CodeNexus India 2026
            </p>
            <p className="mt-4 text-base text-gray-600 leading-relaxed">
              Reality bRand Check AI was conceived to bridge the gap between fast-moving marketing teams and strict brand governance. By standardizing voice guidelines, approved facts, and terminology verification, organizations maintain brand integrity at scale.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs font-medium text-gray-500">
              <span className="px-3 py-1 bg-gray-100 rounded-full">React + TypeScript</span>
              <span className="px-3 py-1 bg-gray-100 rounded-full">Tailwind CSS</span>
              <span className="px-3 py-1 bg-gray-100 rounded-full">FastAPI-ready Architecture</span>
              <span className="px-3 py-1 bg-gray-100 rounded-full">AI Governance Blueprint</span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-gray-50 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Have questions or want early access?</h2>
          <p className="mt-2 text-sm text-gray-600">
            Reach out to the development team working on the CodeNexus India 2026 prototype.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="mailto:contact@realitybrand.ai"
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Contact Team
            </a>
            <Link
              to="/dashboard"
              className="px-5 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-800 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Open Live Dashboard
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

