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

// PUBLIC_INTERFACE
function App() {
  /** Root application component that sets up routes, provides auth context, and renders the dashboard layout. */
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/reports/new" replace />} />
            <Route
              path="/reports/new"
              element={
                <ProtectedRoute>
                  <NewReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team"
              element={
                <ProtectedRoute>
                  <TeamDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/reports/new" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </Router>
  );
}

export default App;
