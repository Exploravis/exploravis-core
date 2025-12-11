import { LogLevel, PublicClientApplication, type Configuration } from "@azure/msal-browser";

const TENANT_ID = import.meta.env.VITE_TENANT_ID as string;
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID as string;

const BASE_URL = `${window.location.origin}/`;

export const REDIRECT_URI = `${BASE_URL}auth/callback`;
export const POST_LOGOUT_URI = BASE_URL;

export const msalConfig: Configuration = {
  auth: {
    clientId: CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    knownAuthorities: [`login.microsoftonline.com/${TENANT_ID}`],
    redirectUri: REDIRECT_URI,
    postLogoutRedirectUri: POST_LOGOUT_URI,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true,
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

// Minimal login request
export const loginRequest = {
  scopes: ["User.Read"],
};

export const isHighTechUser = (account: any): boolean => {
  if (!account?.username) return false;
  return account.username.toLowerCase().endsWith("@hightech.edu");
};
