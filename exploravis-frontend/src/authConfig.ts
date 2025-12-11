// authConfig.ts - FIXED FOR /auth/callback
import { LogLevel, PublicClientApplication, type Configuration } from "@azure/msal-browser";

const TENANT_ID = import.meta.env.VITE_TENANT_ID as string;
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID as string;

// CRITICAL: Dynamic URLs for /auth/callback endpoint
const getConfig = () => {
  const isProduction = window.location.hostname === 'ui.dev-exploravis.mywire.org';

  if (isProduction) {
    return {
      // Point to your /auth/callback endpoint
      redirectUri: 'https://ui.dev-exploravis.mywire.org/auth/callback',
      postLogoutUri: 'https://ui.dev-exploravis.mywire.org',
      cacheLocation: 'localStorage' as const,
      enableCookies: true,
    };
  }

  // Development
  return {
    redirectUri: 'http://localhost:3001/auth/callback',
    postLogoutUri: 'http://localhost:3001',
    cacheLocation: 'sessionStorage' as const,
    enableCookies: false,
  };
};

const config = getConfig();

export const msalConfig: Configuration = {
  auth: {
    clientId: CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    knownAuthorities: [`login.microsoftonline.com/${TENANT_ID}`],
    redirectUri: config.redirectUri, // Must match Azure Portal exactly
    postLogoutRedirectUri: config.postLogoutUri,
  },
  cache: {
    cacheLocation: config.cacheLocation,
    storeAuthStateInCookie: config.enableCookies,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error: console.error(message); break;
          case LogLevel.Warning: console.warn(message); break;
          case LogLevel.Info: console.info(message); break;
          case LogLevel.Verbose: console.debug(message); break;
        }
      },
    },
  },
};

export const loginRequest = {
  scopes: ["User.Read"],
};

export const isHighTechUser = (account: any): boolean => {
  if (!account?.username) return false;
  return account.username.toLowerCase().endsWith("@hightech.edu");
};

// Debug helper
export const logAuthConfig = () => {
  console.log('🔐 Auth Config:');
  console.log('Redirect URI:', msalConfig.auth.redirectUri);
  console.log('Current URL:', window.location.href);
  console.log('Has /auth/callback?', window.location.pathname.includes('/auth/callback'));
};
