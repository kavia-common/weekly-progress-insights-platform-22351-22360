import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout';
import NewReport from './pages/NewReport';
import History from './pages/History';
import TeamDashboard from './pages/TeamDashboard';
import Admin from './pages/Admin';

// PUBLIC_INTERFACE
function App() {
  /** Root application component that sets up routes and renders the dashboard layout. */
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/reports/new" replace />} />
          <Route path="/reports/new" element={<NewReport />} />
          <Route path="/reports/history" element={<History />} />
          <Route path="/team" element={<TeamDashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/reports/new" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
