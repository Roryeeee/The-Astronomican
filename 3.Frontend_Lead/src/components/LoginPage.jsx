import { useState } from 'react';
import styles from './LoginPage.module.css';

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
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>THE-ASTRONOMICAN</h1>
          <p className={styles.subtitle}>Space Situational Awareness Pipeline</p>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          {error && <div className={styles.errorBox}>{error}</div>}

          <div className={styles.inputGroup}>
            <label className={styles.label}>Operator Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@astronomican.com"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'Authenticating...' : 'Access Pipeline'}
          </button>
        </form>
      </div>
    </div>
  );
}