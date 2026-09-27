import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Hexagon, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import Button from '../../components/ui/button';
import styles from './auth.module.css';

export default function Login() {
  const navigate = useNavigate();
  const { login, loginAsDev } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = () => {
    loginAsDev();
    navigate('/');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <Hexagon size={16} strokeWidth={2.5} />
          </div>
          <span className={styles.brandName}>OmniParse IDP</span>
        </div>

        <div>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>
            Universal Intelligent Document Processing platform.
          </p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              className={styles.input}
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" variant="primary" size="md" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight size={14} />
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleDevLogin}
          >
            Continue as Developer (Dev Mode)
          </Button>
        </form>

        <div className={styles.footer}>
          Don&apos;t have an account? <Link to="/signup">Create account</Link>
        </div>
      </div>
    </div>
  );
}