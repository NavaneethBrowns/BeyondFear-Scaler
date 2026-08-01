import { useEffect, useMemo, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { sessionAPI, paymentAPI } from '../services/api';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const buildPolylinePoints = (scores = []) => {
  if (!scores.length) return '';
  const width = 520;
  const height = 180;
  const xStep = scores.length === 1 ? 0 : width / (scores.length - 1);

  return scores
    .map((score, index) => {
      const x = index * xStep;
      const y = height - ((clamp(score, 1, 10) - 1) / 9) * height;
      return `${x},${y}`;
    })
    .join(' ');
};

export const DashboardPage = ({ onNavigate, onLogout, isAuthenticated, user }) => {
  const [sessions, setSessions] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setErrorMessage('');

      try {
        const [sessionResult, paymentResult] = await Promise.all([
          sessionAPI.list(),
          paymentAPI.getStatus(),
        ]);

        setSessions(sessionResult?.sessions || []);
        setSubscription(paymentResult?.subscription || null);
      } catch (error) {
        setErrorMessage(error.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const metrics = useMemo(() => {
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((s) => s?.status === 'completed').length;
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    const scored = sessions
      .map((session) => Number(session?.fearIntensity?.finalScore))
      .filter((score) => Number.isFinite(score) && score >= 1 && score <= 10);

    const avgScore = scored.length
      ? Number((scored.reduce((sum, score) => sum + score, 0) / scored.length).toFixed(1))
      : null;

    const recentScores = sessions
      .slice()
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
      .map((session) => Number(session?.fearIntensity?.finalScore))
      .filter((score) => Number.isFinite(score) && score >= 1 && score <= 10)
      .slice(-12);

    return {
      totalSessions,
      completedSessions,
      completionRate,
      avgScore,
      recentScores,
    };
  }, [sessions]);

  const chartPoints = useMemo(() => buildPolylinePoints(metrics.recentScores), [metrics.recentScores]);

  return (
    <div className="aurora-bg">
      <div className="aurora-mid" />
      <Navbar
        onBrandClick={() => onNavigate('home')}
        onLoginClick={() => onNavigate('login')}
        onSignupClick={() => onNavigate('signup')}
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={onLogout}
      />

      <main className="portfolio-page-shell dashboard-shell">
        <section className="portfolio-card dashboard-header-card">
          <p className="portfolio-kicker">Day 10 Dashboard</p>
          <h1 className="dashboard-title">Progress overview</h1>
          <p className="dashboard-subtitle">
            Track your session momentum, completion quality, and fear-intensity trend in one place.
          </p>
          <div className="dashboard-header-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('chat')}>
              Back to chat
            </button>
          </div>
        </section>

        {errorMessage ? <p className="chat-home-alert chat-home-alert-error">{errorMessage}</p> : null}

        {loading ? (
          <section className="portfolio-card dashboard-loading">Loading dashboard...</section>
        ) : (
          <>
            <section className="dashboard-metrics-grid">
              <article className="portfolio-card metric-card">
                <p className="metric-label">Total Sessions</p>
                <p className="metric-value">{metrics.totalSessions}</p>
              </article>
              <article className="portfolio-card metric-card">
                <p className="metric-label">Completed</p>
                <p className="metric-value">{metrics.completedSessions}</p>
              </article>
              <article className="portfolio-card metric-card">
                <p className="metric-label">Completion Rate</p>
                <p className="metric-value">{metrics.completionRate}%</p>
              </article>
              <article className="portfolio-card metric-card">
                <p className="metric-label">Avg. Final Intensity</p>
                <p className="metric-value">{metrics.avgScore ?? '--'}</p>
              </article>
            </section>

            <section className="portfolio-card chart-card">
              <div className="chart-card-top">
                <h3>Fear Intensity Trend</h3>
                <p>Last {Math.max(metrics.recentScores.length, 1)} scored sessions</p>
              </div>
              {chartPoints ? (
                <svg viewBox="0 0 520 180" className="trend-chart" role="img" aria-label="Fear intensity trend chart">
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(255, 191, 98, 0.9)" />
                      <stop offset="100%" stopColor="rgba(255, 107, 36, 0.15)" />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width="520" height="180" fill="rgba(12,18,34,0.42)" rx="12" />
                  <polyline
                    fill="none"
                    stroke="rgba(255, 179, 92, 0.95)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={chartPoints}
                  />
                </svg>
              ) : (
                <p className="chart-empty">Complete a session with final intensity to render the chart.</p>
              )}
            </section>

            <section className="portfolio-card dashboard-subscription-card">
              <h3>Subscription</h3>
              <p>
                Status: <strong>{subscription?.status || 'free'}</strong>
                {subscription?.planType ? ` (${subscription.planType})` : ''}
              </p>
              <p>
                Expires: {subscription?.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString() : 'N/A'}
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
};
