import React from 'react';

/**
 * PUBLIC_INTERFACE
 * TeamDashboard shows KPI cards and a simple chart placeholder.
 * Intended for Manager/Admin roles. Includes an AI summaries placeholder.
 */
const TeamDashboard = () => {
  const kpis = [
    { label: 'Reports Submitted', value: 42 },
    { label: 'On-time Rate', value: '93%' },
    { label: 'Open Blockers', value: 7 },
    { label: 'Avg. Sentiment', value: 'Positive' },
  ];

  return (
    <>
      <div className="page-title">
        <h1>Team Dashboard</h1>
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
