// authConfig.ts - FIXED VERSION
import { LogLevel, PublicClientApplication, type Configuration } from "@azure/msal-browser";

const TENANT_ID = import.meta.env.VITE_TENANT_ID as string;
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID as string;

const BASE_URL = window.location.origin;

export const REDIRECT_URI = `${BASE_URL}`;
export const POST_LOGOUT_URI = `${BASE_URL}`;

export const msalConfig: Configuration = {
  auth: {
    clientId: CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    knownAuthorities: [`login.microsoftonline.com/${TENANT_ID}`],
    redirectUri: REDIRECT_URI, // Hardcoded, not dynamic
    postLogoutRedirectUri: POST_LOGOUT_URI,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: true,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Info:
            console.info(message);
            break;
          case LogLevel.Verbose:
            console.debug(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
        }
      },
    },
  },
};

// Add debug logging
export const logAuthConfig = () => {
  console.log("🔍 Auth Config Debug:");
  console.log("Client ID:", CLIENT_ID);
  console.log("Hardcoded redirect URI:", REDIRECT_URI);
  console.log("Current window.origin:", window.location.origin);
  console.log("Match?", REDIRECT_URI === window.location.origin);
  console.log("Has trailing slash in window.origin?", window.location.origin.endsWith('/'));
};

export const loginRequest = {
  scopes: ["User.Read"],
};

export const isHighTechUser = (account: any): boolean => {
  if (!account?.username) return false;
  return account.username.toLowerCase().endsWith("@hightech.edu");
};
