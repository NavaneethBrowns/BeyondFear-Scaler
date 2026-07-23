import { Button } from '../components/Button';
import { Navbar } from '../components/Navbar';
import { Heart, Compass, Lock, Zap } from 'lucide-react';

export const Homepage = ({ onNavigate, isAuthenticated, user, onLogout }) => {
  const handleSignupClick = () => onNavigate('signup');
  const handleLoginClick = () => onNavigate('login');

  return (
    <div className="aurora-bg">
      <div className="aurora-mid" />
      <Navbar
        onLoginClick={handleLoginClick}
        onSignupClick={handleSignupClick}
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={onLogout}
      />

      {/* HERO */}
      <section className="hero fade-up">
        <div className="hero-label">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)', display: 'inline-block' }} />
          You are not alone in this.
        </div>

        <h1>
          How much of you have you<br />
          <span className="highlight">lost to fear?</span>
        </h1>

        <p className="hero-sub">
          What you have been, are, and can be, what if removing fear could change
          the trajectory of your life, how you see yourself, and how you see the world?
        </p>

        <p className="hero-sub-small">
          Overcome your fears through clear action.
        </p>

        <div className="hero-cta">
          <Button variant="action" size="lg" onClick={handleSignupClick}>
            Start removing fear
          </Button>
          <Button variant="outline" size="lg" onClick={handleLoginClick}>
            Continue my journey
          </Button>
        </div>

        <p className="hero-trust">
          Private by design &nbsp;&middot;&nbsp; 1 free session &nbsp;&middot;&nbsp; No card required
        </p>
      </section>

      {/* FEELING SEEN - Quote block */}
      <div className="feeling-section fade-up-delay-1">
        <div className="feeling-section-inner">
          <p className="feeling-quote">
            "Fear grows when direction is blurred.<br />
            <em>When clarity returns, the sky clears</em><br />
            and your hands return to meaningful action."
          </p>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', letterSpacing: '0.05em', marginTop: '1rem' }}>
            THAT'S WHAT THIS IS FOR
          </p>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className="page-section">
        <p className="section-label">The conversation</p>
        <h2 className="section-title">Three steps to remove fear through action.</h2>
        <div className="section-divider" />

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Name the fear clearly</h3>
            <p>
              Start with what is actually scaring you right now.
              Not the polished version, the real one. We begin with your fear,
              your words, your lived situation.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Find the root conflict</h3>
            <p>
              We trace the fear to its root: inner conflict, confusion,
              or a blurred direction. Like Arjuna dropping his bow,
              fear often rises when the heart is divided.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Take one corrective action</h3>
            <p>
              Once the root is clear, we define one grounded next step.
              Action is the medicine. Each right step reduces fear,
              restores confidence, and builds momentum.
            </p>
          </div>
        </div>
      </section>

      {/* WHY BEYONDFEAR */}
      <section className="page-section">
        <p className="section-label">Why this is different</p>
        <h2 className="section-title">Built around alignment,<br />not dependency.</h2>
        <div className="section-divider" />

        <div className="why-grid">
          <div className="why-card">
            <div className="why-icon safe">
              <Heart size={20} color="#00ff88" />
            </div>
            <div>
              <h3>Love all, serve all</h3>
              <p>
                A direction is only true if it serves something beyond yourself.
                We help you check: Does this actually contribute, or just extract?
                That clarity changes everything.
              </p>
            </div>
          </div>

          <div className="why-card">
            <div className="why-icon action">
              <Compass size={20} color="#00d9ff" />
            </div>
            <div>
              <h3>Your consciousness is the guide</h3>
              <p>
                You already know. Your intuition knows. Your body knows.
                Your deepest self knows. We help you hear it.
                When all three align, the path is clear.
              </p>
            </div>
          </div>

          <div className="why-card">
            <div className="why-icon private">
              <Lock size={20} color="#8b3dff" />
            </div>
            <div>
              <h3>Completely private</h3>
              <p>
                Your sessions are encrypted. Nobody reads them.
                This is your space to be honest, with yourself and with what's true.
              </p>
            </div>
          </div>

          <div className="why-card">
            <div className="why-icon human">
              <Zap size={20} color="#ff0099" />
            </div>
            <div>
              <h3>Graduation is the goal</h3>
              <p>
                Once you find your direction, you don't need us anymore. That's success.
                We're here to help you become clear, then let you go.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHO THIS IS FOR */}
      <section className="page-section is-for-section">
        <p className="section-label">This is for you if...</p>
        <h2 className="section-title">You recognize yourself here.</h2>
        <div className="section-divider" />

        <div className="is-for-grid">
          <div className="is-for-item">
            <p>
              You feel pulled toward something bigger, a career change, a creative pursuit,
              a commitment, a life direction, but you're stuck.
            </p>
          </div>
          <div className="is-for-item">
            <p>
              You're not sure if it's <em>your</em> desire or someone else's expectation living through you.
            </p>
          </div>
          <div className="is-for-item">
            <p>
              You've been told what you should want, and now you need to find
              what's actually true for you.
            </p>
          </div>
          <div className="is-for-item">
            <p>
              You want your choices to serve something beyond yourself,
              to contribute, not just extract.
            </p>
          </div>
        </div>
      </section>

      {/* WHAT THIS IS NOT */}
      <section className="page-section">
        <p className="section-label">What this is not</p>
        <h2 className="section-title">Clear scope, clear promise.</h2>
        <div className="section-divider" />

        <div className="is-not-grid">
          <div className="is-not-item">
            <p><strong>Not therapy.</strong> If you're experiencing severe anxiety, depression, trauma, or thoughts of self-harm, please reach out to a mental health professional first.</p>
          </div>
          <div className="is-not-item">
            <p><strong>Not a life coach.</strong> We don't tell you what to do or build your personal brand.</p>
          </div>
          <div className="is-not-item">
            <p><strong>Not a retention tool.</strong> Our success is you becoming clear and leaving, not staying dependent on the app.</p>
          </div>
        </div>

        <div className="crisis-box">
          <p>
            <strong>If you're in crisis:</strong> India: Call AASRA (9820466726) or iCall (1-9152-151-515).
            Other countries: Reach out to a local crisis line immediately.
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="cta-section">
        <h2>Fear shrinks when action becomes clear.</h2>
        <p>Start with one honest conversation and one real next step.</p>
        <Button variant="action" size="lg" onClick={handleSignupClick}>
          Start overcoming fear
        </Button>
        <p className="cta-note">First session is free. No credit card. No time limit.</p>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <p className="footer-disclaimer">
          <strong>Important:</strong> BeyondFear is a reflective tool, not a substitute for professional mental health care.
          If you're in crisis, please reach out to a qualified professional or helpline immediately.
        </p>
        <p>&copy; 2026 BeyondFear &nbsp;&middot;&nbsp; India-first &nbsp;&middot;&nbsp; Dharma-aligned &nbsp;&middot;&nbsp; Graduation-oriented</p>
      </footer>
    </div>
  );
};