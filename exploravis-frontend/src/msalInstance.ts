// msalInstance.ts - FIXED
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { msalConfig, logAuthConfig } from "./authConfig";

// Debug first
logAuthConfig();

// Create MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);

// Initialize with proper callback handling
export const initializeMsal = async () => {
  try {
    await msalInstance.initialize();

    console.log("MSAL initialized for callback endpoint");

    // Check if we're on the callback route
    const isCallbackRoute = window.location.pathname.includes('/auth/callback');

    if (isCallbackRoute) {
      console.log("On callback route, handling redirect...");

      const response = await msalInstance.handleRedirectPromise();

      if (response) {
        console.log("Callback handled successfully:", response.account?.username);
        msalInstance.setActiveAccount(response.account);

        // Redirect to home after successful callback
        window.location.href = "/";
      } else {
        console.log("No response in callback, redirecting to home");
        window.location.href = "/";
      }
    } else {
      // Handle normal redirect promise
      const response = await msalInstance.handleRedirectPromise();
      if (response) {
        console.log("Redirect handled:", response.account?.username);
        msalInstance.setActiveAccount(response.account);
      }
    }

    return msalInstance;
  } catch (error) {
    console.error("MSAL initialization failed:", error);

    // Clear cache on specific errors
    if (error.errorCode === "no_token_request_cache_error") {
      console.log("Clearing cache and redirecting...");
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
    }

    throw error;
  }
};
