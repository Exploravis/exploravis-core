import React, { useState, useEffect } from 'react';
import keycloak from './keycloak';

const App: React.FC = () => {
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    // Check if Keycloak is authenticated and ready
    if (keycloak.authenticated) {
      // 1. Load User Profile (optional but gets full user details)
      keycloak.loadUserProfile().then(profile => {
        console.log('User Profile:', profile);
      });

      // 2. Extract Token Claims (the dumped info you need)
      const tokenClaims = keycloak.idTokenParsed;
      setUserInfo(tokenClaims);

    }
  }, []); // Run once on component mount after keycloak init

  const handleLogout = () => {
    keycloak.logout({
      redirectUri: 'http://localhost:5173/' // Redirect to base URL after logout
    });
  };

  if (!keycloak.authenticated) {
    // Should not happen if onLoad: 'login-required' is used, but good practice
    return <div>Loading authentication state...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>🔐 Welcome, {userInfo?.email}!</h2>
      <p>Successfully authenticated via Azure/Microsoft.</p>

      <button onClick={handleLogout} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '5px' }}>
        Logout
      </button>

      <hr style={{ margin: '20px 0' }} />

      <h3>Token Claims Dump (The Info You Need)</h3>
      <pre style={{
        backgroundColor: '#f5f5f5',
        padding: '15px',
        borderRadius: '5px',
        overflowX: 'auto',
        maxHeight: '400px',
      }}>
        {JSON.stringify(userInfo, null, 2)}
      </pre>

      <p><strong>Note:</strong> The full Access Token is available at <code>keycloak.token</code> (not displayed for security).</p>
    </div>
  );
};

export default App;
