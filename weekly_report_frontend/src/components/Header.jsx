import React from 'react';

/**
 * PUBLIC_INTERFACE
 * Header with filters and context actions.
 */
const Header = () => {
  const [week, setWeek] = React.useState('');
  const [team, setTeam] = React.useState('');

  return (
    <header className="header">
      <div className="page-title">
        <h1>Weekly Progress</h1>
        <span className="helper">Ocean Professional</span>
      </div>
      <div className="filters">
        <input
          type="week"
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          aria-label="Select week"
        />
        <select value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Select team">
          <option value="">All Teams</option>
          <option value="alpha">Alpha</option>
          <option value="beta">Beta</option>
          <option value="gamma">Gamma</option>
        </select>
      </div>
    </header>
  );
};

export default Header;
