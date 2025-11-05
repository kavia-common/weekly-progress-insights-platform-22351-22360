import React from 'react';

/**
 * PUBLIC_INTERFACE
 * History displays a placeholder table of previous reports.
 */
const History = () => {
  const rows = [
    { id: 1, week: '2025-W44', name: 'Alex Johnson', summary: 'Shipped auth, fixed bugs' },
    { id: 2, week: '2025-W43', name: 'Taylor Lee', summary: 'Data model updates' },
    { id: 3, week: '2025-W42', name: 'Jordan Kim', summary: 'Infra monitoring' },
  ];

  return (
    <div className="card">
      <div className="page-title">
        <h1>History</h1>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Week</th>
            <th>Employee</th>
            <th>Summary</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.week}</td>
              <td>{r.name}</td>
              <td>{r.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default History;
