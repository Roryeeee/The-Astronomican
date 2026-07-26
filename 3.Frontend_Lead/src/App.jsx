import { useState } from 'react';
import LoginPage from './components/LoginPage';
import Globe from './components/Globe';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>
      <header style={topBarStyle}>
        <span>THE-ASTRONOMICAN</span>
        <button onClick={handleLogout} style={logoutBtnStyle}>Log Out</button>
      </header>

      <Globe />
    </div>
  );
}

const topBarStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 100,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.75rem 1.5rem',
  background: 'rgba(10, 13, 20, 0.85)',
  backdropFilter: 'blur(8px)',
  color: '#fff',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
};

const logoutBtnStyle = {
  padding: '0.4rem 0.8rem',
  background: '#da3633',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};