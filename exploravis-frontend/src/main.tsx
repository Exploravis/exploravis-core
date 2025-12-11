// /src/main.tsx
import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import { initializeMsal, msalInstance } from "./msalInstance";
import App from "./App";
import "./index.css";
import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

// Create root first
const root = ReactDOM.createRoot(document.getElementById("root")!);

// Loading component
const LoadingScreen = () => (
  <div style={{
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  }}>
    <Spin
      indicator={<LoadingOutlined style={{ fontSize: 48, color: "white" }} spin />}
      size="large"
      tip="Initializing application..."
    />
  </div>
);

// Initialize MSAL before rendering
initializeMsal()
  .then(() => {
    root.render(
      <React.StrictMode>
        <MsalProvider instance={msalInstance}>
          <Suspense fallback={<LoadingScreen />}>
            <App />
          </Suspense>
        </MsalProvider>
      </React.StrictMode>
    );
  })
  .catch((error) => {
    console.error("Failed to initialize app:", error);
    root.render(
      <div style={{ padding: 20, fontFamily: 'Arial' }}>
        <h1>Application Error</h1>
        <p>Failed to initialize authentication: {error.message}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  });
