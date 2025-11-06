import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import ConfigWarningBanner from './ConfigWarningBanner';

/**
 * PUBLIC_INTERFACE
 * Layout component renders the application chrome (sidebar + header) and main content area.
 * It also shows a non-intrusive configuration banner when critical env vars are missing.
 */
const Layout = ({ children }) => {
  return (
    <div className="app-shell">
      <Sidebar />
      <Header />
      <main className="content">
        {/* App-wide runtime config banner */}
        <ConfigWarningBanner />
        {children}
      </main>
    </div>
  );
};

export default Layout;
