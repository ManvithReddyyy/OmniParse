import { useState } from 'react';
import type { FormEvent } from 'react';import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

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
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Login failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: '420px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div>
          <h1>Welcome back</h1>
          <p>Login to continue to OmniParse.</p>
        </div>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {error && (
          <p style={{ color: 'red' }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <p>
          Don't have an account?{' '}
          <Link to="/signup">Create one</Link>
        </p>
      </form>
    </div>
  );
}