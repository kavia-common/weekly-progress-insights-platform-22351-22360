import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout';
import NewReport from './pages/NewReport';
import History from './pages/History';
import TeamDashboard from './pages/TeamDashboard';
import Admin from './pages/AdminDashboard';
import ManagerReports from './pages/ManagerReports';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import ConfigWarning from './components/ConfigWarning';
import { isAuthDisabled } from './lib/featureFlags';
import { ToastProvider } from './components/ToastProvider';
import AuthCallback from './pages/AuthCallback';
import Unauthorized from './pages/Unauthorized';
import { ManagerRoute, AdminRoute } from './components/RoleRoutes';

// PUBLIC_INTERFACE
function App() {
  /** Root application component that sets up routes, provides auth context, and renders the dashboard layout. */
  const authDisabled = isAuthDisabled();

  // Helper to optionally wrap in ProtectedRoute based on flag
  const maybeProtect = (children) => {
    return authDisabled ? children : <ProtectedRoute>{children}</ProtectedRoute>;
  };

  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <Layout>
            {authDisabled && (
              <div className="test-mode-banner" role="status" aria-live="polite">
                <ConfigWarning message="Auth disabled for local testing. Routes are accessible without sign-in." />
              </div>
            )}
            <Routes>
              <Route path="/" element={<Navigate to="/reports/new" replace />} />
              <Route path="/reports/new" element={maybeProtect(<NewReport />)} />
              <Route path="/reports/history" element={maybeProtect(<History />)} />
              <Route
                path="/team"
                element={
                  authDisabled ? <TeamDashboard /> : (
                    <ManagerRoute>
                      <TeamDashboard />
                    </ManagerRoute>
                  )
                }
              />
              <Route
                path="/manager/reports"
                element={
                  authDisabled ? <ManagerReports /> : (
                    <ManagerRoute>
                      <ManagerReports />
                    </ManagerRoute>
                  )
                }
              />
              <Route
                path="/admin"
                element={
                  authDisabled ? <Admin /> : (
                    <AdminRoute>
                      <Admin />
                    </AdminRoute>
                  )
                }
              />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="*" element={<Navigate to="/reports/new" replace />} />
            </Routes>
          </Layout>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
