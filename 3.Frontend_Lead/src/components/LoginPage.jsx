import { useState } from 'react';

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      if (email === 'admin@astronomican.com' && password === 'space123') {
        localStorage.setItem('isAuthenticated', 'true');
        setLoading(false);
        onLoginSuccess();
      } else {
        setLoading(false);
        setError('Invalid credentials. (Try: admin@astronomican.com / space123)');
      }
    }, 1000);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>THE-ASTRONOMICAN</h1>
          <p style={styles.subtitle}>Space Situational Awareness Pipeline</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          {error && <div style={styles.errorBox}>{error}</div>}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Operator Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@astronomican.com"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Authenticating...' : 'Access Pipeline'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#0a0d14',
    color: '#e6edf3',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    padding: '2.5rem',
    backgroundColor: '#111622',
    borderRadius: '12px',
    border: '1px solid #1f293d',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    letterSpacing: '1px',
    margin: '0 0 0.5rem 0',
    color: '#58a6ff',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#8b949e',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    padding: '0.75rem 1rem',
    borderRadius: '6px',
    border: '1px solid #30363d',
    backgroundColor: '#0d1117',
    color: '#ffffff',
    fontSize: '0.95rem',
    outline: 'none',
  },
  button: {
    marginTop: '0.5rem',
    padding: '0.85rem',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#1f6feb',
    color: '#ffffff',
    fontWeight: '600',
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  errorBox: {
    padding: '0.75rem',
    borderRadius: '6px',
    backgroundColor: 'rgba(248, 81, 73, 0.15)',
    border: '1px solid #f85149',
    color: '#f85149',
    fontSize: '0.85rem',
    textAlign: 'center',
  },
};