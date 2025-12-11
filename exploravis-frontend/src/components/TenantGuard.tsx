import React, { useEffect, useState } from "react";
import { useMsal, useAccount } from "@azure/msal-react";
import { isHighTechUser } from "../authConfig";
import { Alert, Card, Button, Typography, Result } from "antd";
import {
  CloseCircleOutlined,
  LogoutOutlined,
  SafetyOutlined
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface TenantGuardProps {
  children: React.ReactNode;
}

const TenantGuard: React.FC<TenantGuardProps> = ({ children }) => {
  const { accounts, instance } = useMsal();
  const account = useAccount(accounts[0] || {});
  const [isValidTenant, setIsValidTenant] = useState<boolean>(false);

  useEffect(() => {
    if (account) {
      const valid = isHighTechUser(account);
      setIsValidTenant(valid);

      if (!valid) {
        console.warn(`Unauthorized tenant access attempt: ${account.username}`);
      }
    } else {
      setIsValidTenant(false);
    }
  }, [account]);

  const handleLogout = () => {
    instance.logoutRedirect().catch(e => {
      console.error("Logout failed:", e);
    });
  };

  // No account = show login
  if (!account) {
    return <>{children}</>;
  }

  // Invalid tenant = block access
  if (!isValidTenant) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f5f5"
      }}>
        <Card style={{ maxWidth: 500, borderRadius: 12 }}>
          <Result
            icon={<CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
            title="Access Denied"
            subTitle={
              <>
                Your account <Text code>{account.username}</Text> is not from
                the authorized HighTech tenant.
              </>
            }
            extra={[
              <Button
                key="logout"
                type="primary"
                icon={<LogoutOutlined />}
                onClick={handleLogout}
              >
                Sign Out
              </Button>
            ]}
          />

          <Alert
            message="Security Policy"
            description={
              <div>
                <p>This application is exclusively available to:</p>
                <ul>
                  <li>HighTech University students (@hightech.edu)</li>
                  <li>HighTech University faculty & staff</li>
                </ul>
                <Text type="secondary">
                  Contact your administrator if you believe this is an error.
                </Text>
              </div>
            }
            type="warning"
            showIcon
            style={{ marginTop: 24 }}
          />
        </Card>
      </div>
    );
  }

  // Valid tenant = allow access
  return (
    <>
      {children}
      {/* Optional: Show tenant badge */}
      <div style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        background: "#f6ffed",
        border: "1px solid #b7eb8f",
        borderRadius: 6,
        padding: "8px 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        zIndex: 1000
      }}>
        <SafetyOutlined style={{ color: "#52c41a" }} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          Authenticated: <Text strong>{account.username}</Text>
        </Text>
      </div>
    </>
  );
};

export default TenantGuard;
