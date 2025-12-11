
import { useEffect } from "react";
import { msalInstance } from "../msalInstance.ts";

export default function AuthCallback() {
  useEffect(() => {
    msalInstance.handleRedirectPromise()
      .then(() => {
        window.location.replace("/"); // redirect to your app home
      })
      .catch(err => {
        console.error("MSAL redirect handling failed:", err);
      });
  }, []);

  return <div>Signing you in…</div>;
}
