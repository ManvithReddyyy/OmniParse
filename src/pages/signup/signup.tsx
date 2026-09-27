import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Hexagon, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import Button from '../../components/ui/button';
import styles from '../login/auth.module.css';

export default function Signup() {
  const navigate = useNavigate();
  const { signup, loginAsDev } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await signup(name, email, password);
      setSuccessMsg('Account created successfully! Redirecting...');
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
          <h1 className={styles.title}>Create your account</h1>
          <p className={styles.subtitle}>
            Start parsing documents with PaddleOCR and AI pipelines.
          </p>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {successMsg && (
          <div style={{
            background: 'var(--color-success-bg, rgba(16, 185, 129, 0.12))',
            color: 'var(--color-success, #10b981)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md, 8px)',
            fontSize: '13px',
            marginBottom: '16px',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Full Name</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Alex Johnson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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

          <div className={styles.field}>
            <label className={styles.label}>Confirm Password</label>
            <input
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" variant="primary" size="md" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
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
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}