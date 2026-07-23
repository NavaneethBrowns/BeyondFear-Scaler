import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardBody, CardHeader } from '../components/Card';
import { Navbar } from '../components/Navbar';
import { Send, Plus, PanelLeftClose, PanelLeftOpen, Shield } from 'lucide-react';
import { messageAPI, paymentAPI, sessionAPI } from '../services/api';

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
const RAZORPAY_AMOUNT_PAISE = 29900;

export const ChatPage = ({ onNavigate, onLogout, isAuthenticated, user }) => {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionSummary, setActionSummary] = useState([]);
  const [intensityScore, setIntensityScore] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('free');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const firstName = user?.displayName || user?.email?.split('@')[0] || 'there';

  useEffect(() => {
    const scriptExists = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
    if (scriptExists) {
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  useEffect(() => {
    const loadSubscriptionStatus = async () => {
      try {
        const result = await paymentAPI.getStatus();
        setSubscriptionStatus(result?.subscription?.status || 'free');
      } catch (error) {
        setSubscriptionStatus('free');
      }
    };

    loadSubscriptionStatus();
  }, []);

  useEffect(() => {
    const loadSessions = async () => {
      setSessionsLoading(true);
      setErrorMessage('');

      try {
        const result = await sessionAPI.list();
        const listedSessions = result?.sessions || [];
        setSessions(listedSessions);
        setCurrentSessionId(null);
        setMessages([]);
        setActionSummary([]);
        setIntensityScore('');
      } catch (error) {
        setErrorMessage(error.message || 'Failed to load sessions');
      } finally {
        setSessionsLoading(false);
      }
    };

    loadSessions();
  }, []);

  const loadSessionById = async (sessionId) => {
    setErrorMessage('');
    try {
      const result = await sessionAPI.get(sessionId);
      const session = result?.session;
      if (!session) {
        return;
      }

      setCurrentSessionId(session._id);
      setMessages(session.messages || []);
      setActionSummary([]);
      setIntensityScore(
        typeof session?.fearIntensity?.finalScore === 'number'
          ? String(session.fearIntensity.finalScore)
          : ''
      );
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load selected session');
    }
  };

  const sendMessageToSession = async (sessionId, pendingMessage) => {
    setLoading(true);
    setErrorMessage('');

    const userMessage = { role: 'user', content: pendingMessage, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const result = await messageAPI.send(sessionId, pendingMessage);

      const aiResponse = {
        role: 'assistant',
        content: result?.message || 'I hear you. Let us take the next step together.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiResponse]);
      await loadSessionById(sessionId);
      setActionSummary(result?.actionItems || []);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCheckout = async () => {
    if (subscriptionStatus === 'premium') {
      setPaymentMessage('You already have premium access.');
      return;
    }

    const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!keyId) {
      setPaymentMessage('Payment setup is incomplete. Missing Razorpay key ID.');
      return;
    }

    if (!window.Razorpay) {
      setPaymentMessage('Razorpay SDK failed to load. Please refresh and try again.');
      return;
    }

    setPaymentLoading(true);
    setPaymentMessage('');

    try {
      const order = await paymentAPI.createOrder({
        amount: RAZORPAY_AMOUNT_PAISE,
        currency: 'INR',
        receipt: `bf_${Date.now()}`,
      });

      const options = {
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: 'BeyondFear',
        description: 'Premium access',
        prefill: {
          email: user?.email || '',
        },
        theme: {
          color: '#00d9ff',
        },
        handler: async (response) => {
          try {
            await paymentAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setSubscriptionStatus('premium');
            setPaymentMessage('Payment successful. Premium unlocked.');
          } catch (error) {
            setPaymentMessage(error.message || 'Payment verification failed.');
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentMessage('Payment cancelled. You can try again anytime.');
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on('payment.failed', (event) => {
        const description = event?.error?.description || 'Payment failed. Please try again.';
        setPaymentMessage(description);
      });
      razorpayInstance.open();
    } catch (error) {
      setPaymentMessage(error.message || 'Unable to start payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const createNewSession = async () => {
    setCreatingSession(true);
    setErrorMessage('');
    setPaymentMessage('');

    try {
      const result = await sessionAPI.create({
        title: `Session ${new Date().toLocaleDateString()}`,
      });
      const session = result?.session;
      if (!session) {
        return;
      }

      setSessions((prev) => [session, ...prev]);
      setCurrentSessionId(session._id);
      setMessages([]);
      setActionSummary([]);
      setIntensityScore('');
      setShowUpgradePrompt(false);
      return session;
    } catch (error) {
      if (error.status === 402) {
        setShowUpgradePrompt(true);
        setPaymentMessage('Your free session is used. Upgrade to Premium to start another session.');
      } else {
        setErrorMessage(error.message || 'Failed to create a session');
      }
    } finally {
      setCreatingSession(false);
    }
  };

  const handleLandingSubmit = async (e) => {
    e.preventDefault();

    if (showUpgradePrompt) {
      handleStartCheckout();
      return;
    }

    const pendingMessage = input.trim();
    const session = await createNewSession();

    if (!session || !pendingMessage) {
      return;
    }

    setInput('');
    await sendMessageToSession(session._id, pendingMessage);
  };

  const handleIncognitoChat = async () => {
    if (showUpgradePrompt) {
      handleStartCheckout();
      return;
    }

    await createNewSession();
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !currentSessionId) return;

    const pendingMessage = input;
    setInput('');

    await sendMessageToSession(currentSessionId, pendingMessage);
  };

  const handleCompleteSession = async () => {
    if (!currentSessionId) return;

    const parsedScore = Number.parseInt(intensityScore, 10);
    const score = Number.isFinite(parsedScore) ? parsedScore : undefined;
    if (score !== undefined && (score < 1 || score > 10)) {
      setErrorMessage('Intensity must be between 1 and 10');
      return;
    }

    setErrorMessage('');
    try {
      await sessionAPI.complete(currentSessionId, score);
      const refreshedList = await sessionAPI.list();
      setSessions(refreshedList?.sessions || []);
      await loadSessionById(currentSessionId);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to complete session');
    }
  };

  return (
    <div className="aurora-bg">
      <div className="aurora-mid" />
      <Navbar
        onLoginClick={() => onNavigate('login')}
        onSignupClick={() => onNavigate('signup')}
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={onLogout}
      />

      <div className={`chat-workspace ${sidebarOpen ? 'chat-workspace-sidebar-open' : 'chat-workspace-sidebar-closed'}`}>
        <aside className={`chat-sidebar-panel ${sidebarOpen ? '' : 'chat-sidebar-panel-collapsed'}`}>
          <Card className="chat-sidebar-card">
            <CardHeader>
              <div className="chat-sidebar-header">
                {sidebarOpen && (
                  <div>
                    <h2 className="chat-sidebar-title">Chats</h2>
                    <p className="chat-sidebar-subtitle">
                      {sessions.length > 0 ? 'Pick up where you left off.' : 'Your conversations will appear here.'}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => setSidebarOpen((prev) => !prev)}
                  className="chat-icon-button"
                  title={sidebarOpen ? 'Hide chats menu' : 'Show chats menu'}
                >
                  {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                </button>
              </div>
            </CardHeader>
            {sidebarOpen && (
            <CardBody className="chat-sidebar-body">
              <div className="chat-session-list">
                {sessionsLoading ? (
                  <div className="chat-sidebar-empty">Loading chats...</div>
                ) : sessions.length === 0 ? (
                  <div className="chat-sidebar-empty">
                    Use your free session to start the first conversation.
                  </div>
                ) : (
                  sessions.map((session) => (
                    <button
                      key={session._id}
                      onClick={() => loadSessionById(session._id)}
                      className={`chat-session-item ${
                        currentSessionId === session._id
                          ? 'chat-session-item-active'
                          : ''
                      }`}
                    >
                      <div className="chat-session-title">{session.title || session.fearTitle || 'Untitled Session'}</div>
                      <div className="chat-session-meta">
                        {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : ''}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardBody>
            )}
          </Card>
        </aside>

        <div className="chat-main-panel">
          {!currentSessionId ? (
            <section className="chat-home">
              <div className="chat-home-content">
                <div className="chat-home-toolbar">
                  {!sidebarOpen && (
                    <button
                      type="button"
                      className="chat-home-menu-button"
                      onClick={() => setSidebarOpen(true)}
                      title="Show chats menu"
                    >
                      <PanelLeftOpen className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    className="chat-home-incognito"
                    onClick={handleIncognitoChat}
                    title="Start an incognito chat"
                    disabled={creatingSession || loading}
                  >
                    <Shield className="h-4 w-4" />
                    <span className="chat-home-incognito-tooltip">Incognito chat</span>
                  </button>
                </div>

                <p className="chat-home-eyebrow">
                  {showUpgradePrompt ? 'Free session used' : '1 free session available'}
                </p>
                <h1 className="chat-home-title">
                  {showUpgradePrompt ? 'Ready for another conversation?' : `What\'s on your mind, ${firstName}?`}
                </h1>
                <p className="chat-home-subtitle">
                  {showUpgradePrompt
                    ? 'Upgrade to Premium to unlock more sessions and keep the momentum going.'
                    : 'Start with one honest sentence. BeyondFear helps you turn fear into clarity and a small next step.'}
                </p>

                {errorMessage && (
                  <p className="chat-home-alert chat-home-alert-error">{errorMessage}</p>
                )}
                {paymentMessage && (
                  <p className="chat-home-alert">{paymentMessage}</p>
                )}

                {!showUpgradePrompt && (
                  <form className="chat-home-composer" onSubmit={handleLandingSubmit}>
                    <span className="chat-home-composer-icon">
                      <Plus className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      className="chat-home-input"
                      placeholder="Talk through a fear, a decision, or something you keep avoiding..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={creatingSession || loading}
                    />
                    <Button
                      type="submit"
                      variant="action"
                      size="md"
                      className="chat-home-submit"
                      disabled={creatingSession || loading}
                    >
                      {creatingSession || loading ? 'Starting...' : 'Try Free Session'}
                    </Button>
                  </form>
                )}

                <div className="chat-home-actions">
                  <Button
                    variant={showUpgradePrompt ? 'action' : 'secondary'}
                    size="md"
                    onClick={handleStartCheckout}
                    disabled={paymentLoading || subscriptionStatus === 'premium'}
                  >
                    {subscriptionStatus === 'premium'
                      ? 'Premium Active'
                      : paymentLoading
                        ? 'Opening Checkout...'
                        : 'Upgrade to Premium'}
                  </Button>
                </div>

                <p className="chat-home-note">
                  {showUpgradePrompt
                    ? 'Premium unlocks additional guided sessions.'
                    : 'Use the free session to see how BeyondFear guides one conversation from insight to action.'}
                </p>
              </div>
            </section>
          ) : (
            <div className="flex flex-col h-96 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              {errorMessage && (
                <div className="px-4 py-2 text-sm bg-red-50 text-red-700 border-b border-red-100">
                  {errorMessage}
                </div>
              )}

              {actionSummary.length > 0 && (
                <div className="px-4 py-2 text-xs bg-indigo-50 text-indigo-900 border-b border-indigo-100">
                  <strong>Suggested actions:</strong> {actionSummary.map((item) => item.title).join(', ')}
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className="text-center">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        Start Your Journey
                      </h4>
                      <p className="text-sm text-gray-600 max-w-sm">
                        Share what's on your mind. What fear or limiting belief would you like to explore today?
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="px-4 py-2 border-t border-gray-200 flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={intensityScore}
                  onChange={(e) => setIntensityScore(e.target.value)}
                  placeholder="Final intensity (1-10)"
                  className="w-44"
                />
                <Button variant="outline" size="sm" onClick={handleCompleteSession}>
                  Complete Session
                </Button>
              </div>

              <form onSubmit={sendMessage} className="border-t border-gray-200 p-4 flex gap-2">
                <Input
                  type="text"
                  placeholder="Share what's on your mind..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={loading || !input.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
