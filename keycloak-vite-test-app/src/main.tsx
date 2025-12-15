// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import keycloak from './keycloak.ts';

// Function to initialize Keycloak
const initKeycloak = async () => {
  try {
    const authenticated = await keycloak.init({
      onLoad: 'login-required', // Forces login if not authenticated
      pkceMethod: 'S256', // Highly recommended for security
    });

    if (authenticated) {
      console.log('User is authenticated!');
    } else {
      console.log('User is NOT authenticated. Redirecting to login...');
    }

    // Once initialized, render the app
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

  } catch (error) {
    console.error('Keycloak Initialization Failed:', error);
    document.getElementById('root')!.innerHTML = '<h1>Authentication Failed! Check console.</h1>';
  }
};

initKeycloak();
