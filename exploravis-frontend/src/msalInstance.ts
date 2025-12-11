import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { msalConfig } from "./authConfig";

export const msalInstance = new PublicClientApplication(msalConfig);

// Initialize and handle redirect
export const initializeMsal = async () => {
  try {
    // Initialize MSAL
    await msalInstance.initialize();

    // Handle redirect response
    const response = await msalInstance.handleRedirectPromise();

    if (response) {
      console.log("Login successful:", response.account);
      msalInstance.setActiveAccount(response.account);
    }

    // Set up event callback for future logins
    msalInstance.addEventCallback((event) => {
      if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
        const payload = event.payload as any;
        const account = payload.account;
        msalInstance.setActiveAccount(account);
      }

      if (event.eventType === EventType.LOGOUT_SUCCESS) {
        msalInstance.setActiveAccount(null);
      }
    });

    return msalInstance;
  } catch (error) {
    console.error("MSAL initialization failed:", error);
    throw error;
  }
};
