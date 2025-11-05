import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout';
import NewReport from './pages/NewReport';
import History from './pages/History';
import TeamDashboard from './pages/TeamDashboard';
import Admin from './pages/Admin';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import ConfigWarning from './components/ConfigWarning';
import { isAuthDisabled } from './lib/featureFlags';

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
        <Layout>
          {authDisabled && (
            <div style={{ marginBottom: 12 }}>
              <ConfigWarning message="Auth disabled for local testing. Routes are accessible without sign-in." />
            </div>
          )}
          <Routes>
            <Route path="/" element={<Navigate to="/reports/new" replace />} />
            <Route path="/reports/new" element={maybeProtect(<NewReport />)} />
            <Route path="/reports/history" element={maybeProtect(<History />)} />
            <Route path="/team" element={maybeProtect(<TeamDashboard />)} />
            <Route path="/admin" element={maybeProtect(<Admin />)} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/reports/new" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </Router>
  );
}

export default App;
