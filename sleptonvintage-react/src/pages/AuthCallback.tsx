// Auth Callback page for handling OAuth redirects
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Two possible flows:
        // - PKCE: provider redirects back with ?code=...
        // - Implicit: provider redirects back with #access_token=... in the URL hash
        const url = new URL(window.location.href);
        const hasCode = url.searchParams.has('code');
        const hasAccessToken = window.location.hash.includes('access_token=');

        if (hasCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(url.href);
          if (error) throw error;
        } else if (hasAccessToken) {
          const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
          const access_token = hash.get('access_token');
          const refresh_token = hash.get('refresh_token');

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
          } else {
            throw new Error('Missing access_token/refresh_token in callback URL.');
          }
        }

        // At this point, session should be stored if the callback was valid.
        navigate('/');
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      color: 'white',
      fontFamily: 'Inter, Arial'
    }}>
      <div>
        <h2>Completing sign in...</h2>
        <p>Please wait while we redirect you.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
