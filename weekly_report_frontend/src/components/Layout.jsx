import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

/**
 * PUBLIC_INTERFACE
 * Layout component renders the application chrome (sidebar + header) and main content area.
 */
const Layout = ({ children }) => {
  return (
    <div className="app-shell">
      <Sidebar />
      <Header />
      <main className="content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
