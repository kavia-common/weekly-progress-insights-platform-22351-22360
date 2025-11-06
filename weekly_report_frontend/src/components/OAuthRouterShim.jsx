import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * PUBLIC_INTERFACE
 * OAuthRouterShim
 * Lightweight global effect that detects incoming Supabase OAuth responses
 * (either via hash tokens or authorization code in the query) on any route,
 * and reroutes them to /auth/callback for consistent handling.
 *
 * This prevents scenarios where a provider sends users back to a deep link
 * that is guarded and loses the tokens before AuthCallback can process them.
 */
function OAuthRouterShim() {
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    try {
      const path = location.pathname || '';
      // Only shim when we are NOT already on the callback route
      if (path === '/auth/callback') return;

      const searchParams = new URLSearchParams(location.search || '');
      const hash = (location.hash || '').replace(/^#/, '');
      const hashParams = new URLSearchParams(hash);

      const hasCode = !!searchParams.get('code');
      const hasAccessToken = !!hashParams.get('access_token');
      const hasRefreshToken = !!hashParams.get('refresh_token');

      if (hasCode || (hasAccessToken && hasRefreshToken)) {
        // Preserve full search and hash; send to AuthCallback which knows how to process and clean up
        const dest = `/auth/callback${location.search || ''}${location.hash || ''}`;
        // eslint-disable-next-line no-console
        console.debug('[OAuthRouterShim] Detected OAuth params outside callback. Redirecting to:', dest);
        navigate(dest, { replace: true });
      }
    } catch {
      // ignore parsing errors and do nothing
    }
  }, [location, navigate]);

  return null;
}

export default OAuthRouterShim;
