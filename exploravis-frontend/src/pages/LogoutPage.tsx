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
        // 1. FIRST, check if we're already logged out
        const accounts = instance.getAllAccounts();
        if (accounts.length === 0) {
          console.log("Already logged out, redirecting to home");
          setLogoutStatus('success');
          setTimeout(() => {
            window.location.href = "/";
          }, 1500);
          return;
        }

        // 2. Clear local storage (but keep MSAL tokens for now)
        // Don't clear everything immediately - Azure needs some tokens
        const keysToRemove = Object.keys(sessionStorage).filter(key =>
          !key.includes('msal.') && !key.includes('.authority')
        );
        keysToRemove.forEach(key => sessionStorage.removeItem(key));

        const localKeysToRemove = Object.keys(localStorage).filter(key =>
          !key.includes('msal.')
        );
        localKeysToRemove.forEach(key => localStorage.removeItem(key));

        console.log("Cleared non-MSL storage");

        // 3. Use logoutPopup instead of logoutRedirect to avoid loop
        await instance.logoutPopup({
          postLogoutRedirectUri: window.location.origin,
          authority: instance.getConfiguration().auth.authority,
        });

        // 4. After popup closes, clear everything
        sessionStorage.clear();
        localStorage.clear();
        await instance.clearCache();
        instance.setActiveAccount(null);

        setLogoutStatus('success');

        // 5. Redirect after delay
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);

      } catch (error: any) {
        console.error("Logout error:", error);
        setLogoutStatus('error');
        setErrorMessage(error.message || 'Unknown error during logout');

        // Final cleanup even on error
        sessionStorage.clear();
        localStorage.clear();
        instance.setActiveAccount(null);

        // Redirect anyway
        setTimeout(() => {
          window.location.href = "/";
        }, 3000);
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
            Closing your secure session...
          </Text>

          <Alert
            message="HighTech University Portal"
            description="A popup will open for Microsoft logout"
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
              If a popup doesn't open, check your browser settings
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
            description="Redirecting to login page..."
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
        background: "#f5f5f5"
      }}>
        <Card
          style={{
            width: 450,
            textAlign: "center",
            borderRadius: 12,
          }}
          bodyStyle={{ padding: 32 }}
        >
          <Result
            icon={<CloseCircleOutlined style={{ color: "#ff4d4f", fontSize: 64 }} />}
            title="Logout Issue"
            subTitle="There was a problem with the popup logout"
            extra={[
              <Button
                key="retry"
                type="primary"
                danger
                onClick={handleRetryLogout}
                style={{ marginRight: 8 }}
              >
                Try Again
              </Button>,
              <Button
                key="home"
                onClick={handleReturnHome}
              >
                Go to Home
              </Button>,
            ]}
          />

          <Alert
            message="Note"
            description="Your local session has been cleared. You may need to clear browser cookies."
            type="warning"
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
            <Title level={5}>Quick Fix:</Title>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>Click "Go to Home" above</li>
              <li>If still logged in, try logout again</li>
              <li>Use browser's incognito mode for testing</li>
            </ul>
          </div>
        </Card>
      </div>
    );
  }

  return null;
};

export default LogoutPage;
