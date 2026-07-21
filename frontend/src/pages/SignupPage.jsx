import { useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardBody, CardHeader } from '../components/Card';
import { Navbar } from '../components/Navbar';
import { ArrowLeft } from 'lucide-react';
import { authAPI } from '../services/api';

export const SignupPage = ({ onNavigate, onAuthSuccess, isAuthenticated, user, onLogout }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const result = await authAPI.signup(email, password);
      
      // Save token and user
      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('token', result.token);
      
      onAuthSuccess(result.user);
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Navbar
        onLoginClick={() => onNavigate('login')}
        onSignupClick={() => {}}
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
            <h2>Create your account</h2>
            <p>3 free sessions, no card required.</p>
          </CardHeader>

          <CardBody>
            <form onSubmit={handleSubmit} className="auth-form-group">
              <div>
                <label className="auth-label">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="auth-label">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="auth-label">Confirm Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="alert alert-error">
                  {error}
                </div>
              )}

              <Button type="submit" variant="action" size="lg" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Creating account...' : 'Create account'}
              </Button>

              <p style={{ textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                Already have an account?{' '}
                <button type="button" onClick={() => onNavigate('login')} className="btn btn-ghost" style={{ padding: 0, color: 'var(--accent-primary)', fontWeight: '500', fontSize: 'var(--font-size-sm)' }}>
                  Log in
                </button>
              </p>
            </form>
          </CardBody>
        </Card>

        <p className="auth-privacy">
          🔒 Your email is encrypted and never shared. Sessions are private by default.
        </p>
      </div>
    </div>
  );
};
