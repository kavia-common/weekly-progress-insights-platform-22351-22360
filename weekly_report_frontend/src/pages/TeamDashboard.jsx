import React from 'react';

/**
 * PUBLIC_INTERFACE
 * TeamDashboard shows KPI cards and a simple chart placeholder.
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
      <div className="card">
        <div className="chart">Chart Placeholder</div>
      </div>
    </>
  );
};

export default TeamDashboard;
