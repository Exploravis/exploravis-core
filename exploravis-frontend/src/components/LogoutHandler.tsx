import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { Card, Spin, Alert, Typography, Result, Button } from "antd";
import {
  LogoutOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoginOutlined
} from "@ant-design/icons";

const { Title, Text } = Typography;

const LogoutPage = () => {
  const { instance } = useMsal();
  const [logoutStatus, setLogoutStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const performLogout = async () => {
      setLogoutStatus('processing');

      try {
        // 1. Clear all local storage first
        const msalKeys = Object.keys(sessionStorage).filter(key =>
          key.includes('msal') || key.includes('.authority') || key.includes('.nonce')
        );
        console.log("Clearing MSAL keys:", msalKeys);

        sessionStorage.clear();
        localStorage.clear();

        // 2. Clear MSAL cache
        await instance.clearCache();
        instance.setActiveAccount(null);

        // 3. Perform Azure AD logout with redirect back to home
        await instance.logoutRedirect({
          postLogoutRedirectUri: window.location.origin,
          authority: instance.getConfiguration().auth.authority,
        });

        // If redirect succeeds, this code won't run
        setLogoutStatus('success');

      } catch (error: any) {
        console.error("Logout error:", error);
        setLogoutStatus('error');
        setErrorMessage(error.message || 'Unknown error during logout');

        // Even if Azure logout fails, ensure local cleanup
        sessionStorage.clear();
        localStorage.clear();
        instance.setActiveAccount(null);
      }
    };

    performLogout();
  }, [instance]);

  const handleReturnHome = () => {
    window.location.href = "/";
  };

  const handleRetryLogout = () => {
    // Clear everything and retry
    sessionStorage.clear();
    localStorage.clear();
    window.location.reload();
  };

  if (logoutStatus === 'processing') {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      }}>
        <Card
          style={{
            width: 400,
            textAlign: "center",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)"
          }}
          bodyStyle={{ padding: 32 }}
        >
          <Spin
            size="large"
            style={{ marginBottom: 24 }}
            tip="Signing out..."
          />

          <Title level={4} style={{ marginBottom: 16 }}>
            <LogoutOutlined style={{ marginRight: 8 }} />
            Signing Out
          </Title>

          <Text type="secondary">
            You are being securely logged out from:
          </Text>

          <Alert
            message="HighTech University Portal"
            description="Clearing your session and redirecting..."
            type="info"
            showIcon
            style={{ margin: "16px 0" }}
          />

          <div style={{
            marginTop: 24,
            padding: 12,
            background: "#fffbe6",
            borderRadius: 6,
            border: "1px solid #ffe58f"
          }}>
            <Text type="warning">
              Please wait while we secure your logout...
            </Text>
          </div>
        </Card>
      </div>
    );
  }

  if (logoutStatus === 'success') {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)"
      }}>
        <Card
          style={{
            width: 450,
            textAlign: "center",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)"
          }}
          bodyStyle={{ padding: 32 }}
        >
          <Result
            icon={<CheckCircleOutlined style={{ color: "#52c41a", fontSize: 64 }} />}
            title="Successfully Signed Out"
            subTitle="You have been securely logged out from all systems."
            extra={[
              <Button
                key="home"
                type="primary"
                icon={<LoginOutlined />}
                onClick={handleReturnHome}
                size="large"
                style={{ marginTop: 16 }}
              >
                Return to Login
              </Button>,
            ]}
          />

          <Alert
            message="Session Cleared"
            description="All local authentication data has been removed from your browser."
            type="success"
            showIcon
            style={{ marginTop: 24 }}
          />
        </Card>
      </div>
    );
  }

  if (logoutStatus === 'error') {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
      }}>
        <Card
          style={{
            width: 450,
            textAlign: "center",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)"
          }}
          bodyStyle={{ padding: 32 }}
        >
          <Result
            icon={<CloseCircleOutlined style={{ color: "#ff4d4f", fontSize: 64 }} />}
            title="Logout Error"
            subTitle="There was a problem during logout"
            extra={[
              <Button
                key="retry"
                type="primary"
                danger
                onClick={handleRetryLogout}
                style={{ marginRight: 8 }}
              >
                Retry Logout
              </Button>,
              <Button
                key="home"
                onClick={handleReturnHome}
              >
                Return to Home
              </Button>,
            ]}
          />

          <Alert
            message="Error Details"
            description={errorMessage || "An unknown error occurred"}
            type="error"
            showIcon
            style={{ marginTop: 24 }}
          />

          <div style={{
            marginTop: 24,
            padding: 16,
            background: "#f6ffed",
            borderRadius: 6,
            textAlign: 'left'
          }}>
            <Title level={5}>Troubleshooting:</Title>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>Local session has been cleared</li>
              <li>Try logging out again</li>
              <li>Clear browser cookies if problem persists</li>
              <li>Contact IT support if needed</li>
            </ul>
          </div>
        </Card>
      </div>
    );
  }

  return null;
};

export default LogoutPage;
