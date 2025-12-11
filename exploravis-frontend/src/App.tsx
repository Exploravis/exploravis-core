import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthenticatedTemplate, UnauthenticatedTemplate } from "@azure/msal-react";
import SimpleLayout from "./components/Layout";
import ScanSearch from "./pages/ScanSearch";
import IPPage from "./pages/IPPage";
import ScanIdSearch from "./pages/ScanIdSearch";
import HomePage from "./pages/HomePage";
import DispatchScan from "./pages/DispatchScan";
import StatusPage from "./pages/StatusPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TenantGuard from "./components/TenantGuard";
import LoginPage from "./components/LoginPage";
import { Layout } from "antd";
import LogoutPage from "./pages/LogoutPage";
import AuthCallback from "./pages/AuthCallback.tsx";

const queryClient = new QueryClient();
const { Content } = Layout;

// Protected router - only shows when authenticated
const ProtectedRouter = () => (
  <QueryClientProvider client={queryClient}>
    <SimpleLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/scans" element={<ScanSearch />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/scans/:scan_id" element={<ScanIdSearch />} />
        <Route path="/dispatch" element={<DispatchScan />} />
        <Route path="/ip/:ip" element={<IPPage />} />
        <Route path="/logout" element={<LogoutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SimpleLayout>
  </QueryClientProvider>
);

// Main App component
const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* MSAL redirect page must be outside AuthenticatedTemplate */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Authentication wrappers */}
        <Route
          path="/*"
          element={
            <>
              <UnauthenticatedTemplate>
                <LoginPage />
              </UnauthenticatedTemplate>

              <AuthenticatedTemplate>
                <Layout style={{ minHeight: "100vh" }}>
                  <TenantGuard>
                    <ProtectedRouter />
                  </TenantGuard>
                </Layout>
              </AuthenticatedTemplate>
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
