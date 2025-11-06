import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * PUBLIC_INTERFACE
 * TeamDashboard shows KPI cards and a simple chart placeholder.
 * Intended for Manager/Admin roles. Includes an AI summaries placeholder.
 * Redirects to TeamSelector if no team is selected.
 */
const TeamDashboard = () => {
  const { team, teamLoading } = useAuth();
  const location = useLocation();

  if (teamLoading) {
    return (
      <div className="card">
        <div className="helper" aria-busy="true">Loading…</div>
      </div>
    );
  }

  if (!team) {
    return <Navigate to="/select-team" replace state={{ from: location }} />;
  }

  const kpis = [
    { label: 'Reports Submitted', value: 42 },
    { label: 'On-time Rate', value: '93%' },
    { label: 'Open Blockers', value: 7 },
    { label: 'Avg. Sentiment', value: 'Positive' },
  ];

  return (
    <>
      <div className="page-title">
        <h1>Team Dashboard · {team?.name || team?.id}</h1>
      </div>
      <div className="kpis">
        {kpis.map((k) => (
          <div key={k.label} className="kpi">
            <div className="label">{k.label}</div>
            <div className="value">{k.value}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="chart">Chart Placeholder</div>
      </div>
      <div className="card">
        <div className="page-title" style={{ marginBottom: 8 }}>
          <h1 style={{ fontSize: 16, margin: 0 }}>AI Summaries</h1>
        </div>
        <div className="helper" style={{ marginBottom: 8 }}>
          Placeholder for AI-generated summaries of team progress, risk highlights, and cross-team trends.
        </div>
        <div>
          <a href="/manager/reports" className="btn">Open Team Reports & AI Summary</a>
        </div>
      </div>
    </>
  );
};

export default TeamDashboard;
