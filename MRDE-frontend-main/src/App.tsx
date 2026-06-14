import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import AuthPage from './auth/AuthPage';
import ProtectedRoute from './auth/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import GlobePage from './pages/GlobePage';
import Dashboard from './pages/Dashboard';
import { DashboardProvider } from './state/DashboardContext';
import { ThemeProvider } from './state/ThemeContext';

function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ type: 'spring', stiffness: 140, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();
  return (
    <ThemeProvider>
      <DashboardProvider>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/login"
              element={
                <PageTransition>
                  <AuthPage />
                </PageTransition>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <PageTransition>
                    <LandingPage />
                  </PageTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="/globe"
              element={
                <ProtectedRoute>
                  <PageTransition>
                    <GlobePage />
                  </PageTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <PageTransition>
                    <Dashboard />
                  </PageTransition>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </DashboardProvider>
    </ThemeProvider>
  );
}
