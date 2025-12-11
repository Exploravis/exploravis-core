// components/SimpleNavbar.tsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Globe, Github, Fence, LogOut, User } from "lucide-react";
import { useMsal, useIsAuthenticated, useAccount } from "@azure/msal-react";
import { Button, Dropdown, Avatar, Space, Typography, Badge } from "antd";
import { LogoutOutlined, SafetyOutlined } from "@ant-design/icons";
import { isHighTechUser } from "../authConfig";

const { Text } = Typography;

const SimpleNavbar = () => {
  const location = useLocation();
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const account = useAccount(accounts[0] || {});

  const navItems = [
    { path: "/", label: "Home", icon: <Home size={16} /> },
    { path: "/scans", label: "Scans", icon: <Search size={16} /> },
    { path: "/status", label: "Status", icon: <Fence size={16} /> },
    { path: "/dispatch", label: "New Scan", icon: <Search size={16} /> },
  ];
  const navigate = useNavigate();

  const userMenuItems = [
    {
      key: 'user-info',
      label: (
        <div style={{ padding: '8px 12px', minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar
              size="large"
              style={{
                backgroundColor: account?.username?.includes('@hightech.edu') ? '#52c41a' : '#1890ff'
              }}
            >
              {account?.name?.charAt(0) || account?.username?.charAt(0) || 'U'}
            </Avatar>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {account?.name || 'User'}
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                {account?.username || 'No email'}
              </div>
            </div>
          </div>
          {account && isHighTechUser(account) && (
            <div style={{
              marginTop: 8,
              padding: '4px 8px',
              background: '#f6ffed',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <SafetyOutlined style={{ color: '#52c41a', fontSize: 12 }} />
              <Text type="success" style={{ fontSize: 12 }}>Verified @hightech.edu</Text>
            </div>
          )}
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      label: (
        <Space>
          <LogoutOutlined />
          <span>Sign Out</span>
        </Space>
      ),
      danger: true,
      onClick: () => navigate('/logout'),
    },
  ];

  return (
    <nav style={{
      backgroundColor: '#1a1a1a',
      color: 'white',
      padding: '1rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #333',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
    }}>
      {/* Logo & Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#3b82f6',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}>
            EA
          </div>
          <span style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>ExplorAvis</span>
        </Link>

        {/* Navigation - Only show when authenticated */}
        {isAuthenticated && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  textDecoration: 'none',
                  color: location.pathname === item.path ? '#60a5fa' : '#d1d5db',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '4px',
                  fontWeight: location.pathname === item.path ? '600' : '400',
                  backgroundColor: location.pathname === item.path ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  transition: 'all 0.2s',
                }}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Right Section: GitHub & User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* GitHub Button */}
        <button
          onClick={() => window.open('https://github.com/exploravis', '_blank')}
          style={{
            backgroundColor: '#374151',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#374151'}
        >
          <Github size={16} />
          GitHub
        </button>

        {/* User Profile (when authenticated) */}
        {isAuthenticated && account && (
          <Dropdown
            menu={{ items: userMenuItems }}
            trigger={['click']}
            placement="bottomRight"
            overlayStyle={{ minWidth: 250 }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              transition: 'all 0.2s',
            }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            >
              <Badge
                dot
                color={isHighTechUser(account) ? "#52c41a" : "#faad14"}
                offset={[-2, 28]}
              >
                <Avatar
                  size="small"
                  style={{
                    backgroundColor: isHighTechUser(account) ? '#52c41a' : '#faad14'
                  }}
                >
                  {account?.name?.charAt(0) || account?.username?.charAt(0) || 'U'}
                </Avatar>
              </Badge>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Text style={{
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 500,
                  lineHeight: 1.2
                }}>
                  {account?.name?.split(' ')[0] || 'User'}
                </Text>
                <Text style={{
                  color: '#9ca3af',
                  fontSize: 10,
                  lineHeight: 1.2
                }}>
                  {account?.username?.split('@')[0] || ''}
                </Text>
              </div>
            </div>
          </Dropdown>
        )}
      </div>
    </nav>
  );
};

export default SimpleNavbar;
