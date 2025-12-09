// components/SimpleNavbar.tsx
import { Link, useLocation } from "react-router-dom";
import { Home, Search, Globe, Github } from "lucide-react";

const SimpleNavbar = () => {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Home", icon: <Home size={16} /> },
    { path: "/scans", label: "Scans", icon: <Search size={16} /> },
    { path: "/dispatch", label: "New Scan", icon: <Search size={16} /> },
  ];

  return (
    <nav style={{
      backgroundColor: '#1a1a1a',
      color: 'white',
      padding: '1rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #333'
    }}>
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

      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
              padding: '0.5rem',
              borderRadius: '4px',
              fontWeight: location.pathname === item.path ? '600' : '400'
            }}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

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
            marginLeft: '1rem'
          }}
        >
          <Github size={16} />
          GitHub
        </button>
      </div>
    </nav>
  );
};

export default SimpleNavbar;
