import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ContentReviewPage } from './pages/ContentReviewPage';
import { BrandManagementPage } from './pages/BrandManagementPage';
import { BrandGuidelinesPage } from './pages/BrandGuidelinesPage';
import { ToneRulesPage } from './pages/ToneRulesPage';
import { ApprovedFactsPage } from './pages/ApprovedFactsPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Dashboard & Governance Internal Area */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="review" element={<ContentReviewPage />} />
          <Route path="brands" element={<BrandManagementPage />} />
          <Route path="guidelines" element={<BrandGuidelinesPage />} />
          <Route path="tone-rules" element={<ToneRulesPage />} />
          <Route path="facts" element={<ApprovedFactsPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
