import { Button } from '../components/Button';
import { Navbar } from '../components/Navbar';
import { Heart, Compass, Lock, Zap } from 'lucide-react';

export const Homepage = ({ onNavigate, isAuthenticated, user, onLogout }) => {
  const handleSignupClick = () => onNavigate('signup');
  const handleLoginClick = () => onNavigate('login');
  const capabilityCards = [
    {
      title: 'Clear Fear Mapping',
      description: 'Turn confusion into a visible pattern you can actually respond to.',
      icon: Compass,
    },
    {
      title: 'Actionable Insight',
      description: 'Each conversation moves toward one concrete next step, not endless reflection.',
      icon: Zap,
    },
    {
      title: 'Private by Default',
      description: 'Protected personal space for honest conversations and grounded decision-making.',
      icon: Lock,
    },
  ];

  const featureTiles = [
    {
      eyebrow: 'Fear clarity',
      title: 'See the pattern before it runs the day.',
      copy: 'Name what is pulling you back, understand why it carries weight, and stop treating the surface symptom as the whole story.',
    },
    {
      eyebrow: 'Movement',
      title: 'Move from reflection into action.',
      copy: 'BeyondFear ends each useful conversation with a next step small enough to take and meaningful enough to shift momentum.',
    },
    {
      eyebrow: 'Trust',
      title: 'Conversations feel held, not exposed.',
      copy: 'This is designed as a calm, private environment where honesty is easier and action feels less overwhelming.',
    },
  ];

  return (
    <div className="aurora-bg">
      <div className="aurora-mid" />
      <Navbar
        onBrandClick={() => onNavigate('home')}
        onLoginClick={handleLoginClick}
        onSignupClick={handleSignupClick}
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={onLogout}
      />

      <main className="portfolio-page-shell">
        <section className="portfolio-grid portfolio-hero-grid">
          <article className="portfolio-card portfolio-card-profile">
            <div className="portfolio-trust-stack">
              <p className="portfolio-kicker">Start simply</p>
              <h2>1 free session</h2>
              <p>No card required. Private by default. One honest conversation to begin.</p>
            </div>
          </article>

          <article className="portfolio-card portfolio-card-intro">
            <p className="portfolio-kicker">Clarity for real life</p>
            <h1 className="portfolio-title">Move through fear with one honest conversation at a time.</h1>
            <p className="portfolio-copy">
              BeyondFear helps you name the real fear, locate the inner conflict underneath it,
              and convert that clarity into a grounded next step.
            </p>
            <div className="portfolio-actions">
              <Button variant="action" size="lg" onClick={handleSignupClick}>Start free session</Button>
              <Button variant="outline" size="lg" onClick={handleLoginClick}>Continue journey</Button>
            </div>
          </article>

          <article className="portfolio-card portfolio-card-highlight">
            <div className="portfolio-glow-orb" aria-hidden="true" />
          </article>
        </section>

        <section className="portfolio-grid portfolio-capability-grid">
          <article className="portfolio-card portfolio-card-heading">
            <h2>What BeyondFear does</h2>
          </article>

          {capabilityCards.map(({ title, description, icon: Icon }) => (
            <article key={title} className="portfolio-card portfolio-card-capability">
              <div className="portfolio-icon-wrap">
                <Icon size={18} />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </section>

        <section className="portfolio-grid portfolio-story-grid">
          <article className="portfolio-card portfolio-card-wide">
            <p className="portfolio-kicker">How it works</p>
            <h2 className="portfolio-section-title">Three moves from fear to action</h2>
            <div className="portfolio-steps-inline">
              <div>
                <span>01</span>
                <h3>Name the fear</h3>
                <p>Start with the unpolished truth rather than a filtered version of the problem.</p>
              </div>
              <div>
                <span>02</span>
                <h3>Find the conflict</h3>
                <p>Understand what value, memory, or expectation is actually giving the fear power.</p>
              </div>
              <div>
                <span>03</span>
                <h3>Take one next step</h3>
                <p>End with one move you can make today so insight turns into momentum.</p>
              </div>
            </div>
          </article>

          <article className="portfolio-card portfolio-card-tall">
            <h3>Private by default</h3>
            <p>Conversations stay in your space so honesty comes easier and insight lands deeper.</p>
          </article>

          <article className="portfolio-card portfolio-card-quote">
            <p>
              "When clarity returns, fear stops making every decision for you."
            </p>
          </article>

          <article className="portfolio-card portfolio-card-wide-secondary">
            <p className="portfolio-kicker">Built for alignment</p>
            <h3>Designed to help you leave stronger, not stay dependent.</h3>
            <p>
              The goal is not endless conversation. The goal is clarity, action, and eventually not needing the tool.
            </p>
          </article>
        </section>

        <section className="portfolio-grid portfolio-feature-grid">
          {featureTiles.map((tile) => (
            <article key={tile.title} className="portfolio-card portfolio-card-feature">
              <p className="portfolio-kicker">{tile.eyebrow}</p>
              <h3>{tile.title}</h3>
              <p>{tile.copy}</p>
            </article>
          ))}
        </section>

        <section className="portfolio-grid portfolio-final-grid">
          <article className="portfolio-card portfolio-card-cta">
            <p className="portfolio-kicker">First session free</p>
            <h2 className="portfolio-section-title">Fear shrinks when action becomes clear.</h2>
            <p className="portfolio-copy">
              Start with one real conversation and leave with one concrete next step.
            </p>
            <Button variant="action" size="lg" onClick={handleSignupClick}>Begin now</Button>
          </article>

          <article className="portfolio-card portfolio-card-note">
            <h3>Important</h3>
            <p>
              BeyondFear is a reflective tool, not a substitute for professional mental health care.
              If you are in crisis, seek qualified support immediately.
            </p>
          </article>
        </section>
      </main>
    </div>
  );
};