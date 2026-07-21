import { useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardBody, CardHeader } from '../components/Card';
import { Navbar } from '../components/Navbar';
import { ArrowLeft } from 'lucide-react';
import { authAPI } from '../services/api';

export const LoginPage = ({ onNavigate, onAuthSuccess, isAuthenticated, user, onLogout }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const result = await authAPI.login(email, password);
      
      // Save token and user
      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('token', result.token);
      
      onAuthSuccess(result.user);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Navbar
        onLoginClick={() => {}}
        onSignupClick={() => onNavigate('signup')}
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={onLogout}
      />

      <div className="auth-container">
        <button onClick={() => onNavigate('home')} className="auth-back-btn">
          <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
          Back
        </button>

        <Card>
          <CardHeader>
            <h2>Welcome back</h2>
            <p>Continue where you left off.</p>
          </CardHeader>

          <CardBody>
            <form onSubmit={handleSubmit} className="auth-form-group">
              <div>
                <label className="auth-label">Email</label>
                <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
              </div>

              <div>
                <label className="auth-label">Password</label>
                <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
              </div>

              {error && <div className="alert alert-error">{error}</div>}

              <Button type="submit" variant="action" size="lg" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Logging in...' : 'Log in'}
              </Button>

              <p style={{ textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                Don't have an account?{' '}
                <button type="button" onClick={() => onNavigate('signup')} className="btn btn-ghost" style={{ padding: 0, color: 'var(--accent-primary)', fontWeight: '500', fontSize: 'var(--font-size-sm)' }}>
                  Sign up
                </button>
              </p>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
