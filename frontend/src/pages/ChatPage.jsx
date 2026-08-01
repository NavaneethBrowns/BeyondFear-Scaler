import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Navbar } from '../components/Navbar';
import { Send, Plus, PanelLeftClose, PanelLeftOpen, Shield, BarChart3 } from 'lucide-react';
import { messageAPI, paymentAPI, sessionAPI } from '../services/api';
import logo from '../assets/beyondfear-logo.svg';
import { PaymentModal } from '../components/PaymentModal';
import { SubscriptionBadge } from '../components/SubscriptionBadge';

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

export const ChatPage = ({ onNavigate, onLogout, isAuthenticated, user }) => {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [landingInput, setLandingInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionSummary, setActionSummary] = useState([]);
  const [intensityScore, setIntensityScore] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentPlansLoading, setPaymentPlansLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('free');
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [sessionsInfo, setSessionsInfo] = useState(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [paymentPlans, setPaymentPlans] = useState([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPlanType, setSelectedPlanType] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [menuOpenSessionId, setMenuOpenSessionId] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, sessionId: null });
  const firstName = user?.displayName || user?.email?.split('@')[0] || 'there';
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const closeMenus = () => {
      setMenuOpenSessionId(null);
      setContextMenu({ visible: false, x: 0, y: 0, sessionId: null });
    };

    window.addEventListener('click', closeMenus);
    return () => window.removeEventListener('click', closeMenus);
  }, []);

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

  const loadSubscriptionStatus = async () => {
    try {
      const result = await paymentAPI.getStatus();
      setSubscriptionStatus(result?.subscription?.status || 'free');
      setSubscriptionInfo(result?.subscription || null);
      setSessionsInfo(result?.sessions || null);
      setShowUpgradePrompt(result?.canCreateSession === false);
      if (result?.limitMessage) {
        setPaymentMessage(result.limitMessage);
      }
    } catch (error) {
      setSubscriptionStatus('free');
      setSubscriptionInfo(null);
      setSessionsInfo(null);
    }
  };

  useEffect(() => {
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

      const rawMessage = result?.message;
      const normalizedMessage = typeof rawMessage === 'string'
        ? rawMessage
        : rawMessage?.reply || result?.reply || '';

      const aiResponse = {
        role: 'assistant',
        content: normalizedMessage || 'I hear you. Let us take the next step together.',
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

  const openPaymentModal = async () => {
    setPaymentModalOpen(true);
    setPaymentPlansLoading(true);
    setPaymentMessage('');

    try {
      const result = await paymentAPI.getPlans();
      setPaymentPlans(result?.plans || []);
    } catch (error) {
      setPaymentMessage(error.message || 'Failed to load pricing plans.');
    } finally {
      setPaymentPlansLoading(false);
    }
  };

  const handleStartCheckout = async (planType) => {
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
    setSelectedPlanType(planType || '');
    setPaymentMessage('');

    try {
      const orderResponse = await paymentAPI.createOrder({ planType });
      const order = orderResponse?.order;
      if (!order?.order_id) {
        throw new Error('Order creation failed. Missing order ID.');
      }

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
          color: '#ff8a2e',
        },
        handler: async (response) => {
          try {
            await paymentAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await loadSubscriptionStatus();
            setShowUpgradePrompt(false);
            setPaymentModalOpen(false);
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
        paymentAPI.recordFailure({
          orderId: order.order_id,
          reason: description,
        }).catch(() => {});
      });
      razorpayInstance.open();
    } catch (error) {
      setPaymentMessage(error.message || 'Unable to start payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const createNewSession = async ({ incognito = false } = {}) => {
    setCreatingSession(true);
    setErrorMessage('');
    setPaymentMessage('');

    try {
      const result = await sessionAPI.create({
        title: `Session ${new Date().toLocaleDateString()}`,
        incognito,
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
      setChatInput('');
      setShowUpgradePrompt(false);
      return session;
    } catch (error) {
      if (error.status === 402) {
        setShowUpgradePrompt(true);
        setPaymentMessage(
          error?.details?.error ||
          'Your free session is used. Upgrade to Premium to start another session.'
        );
        setSessionsInfo(error?.details?.sessionLimit || sessionsInfo);
        openPaymentModal();
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
      openPaymentModal();
      return;
    }

    const pendingMessage = landingInput.trim();
    const session = await createNewSession();

    if (!session || !pendingMessage) {
      return;
    }

    setLandingInput('');
    await sendMessageToSession(session._id, pendingMessage);
  };

  const handleIncognitoChat = async () => {
    if (showUpgradePrompt) {
      openPaymentModal();
      return;
    }

    if (subscriptionStatus !== 'premium') {
      setPaymentMessage('Incognito chat is a premium feature. Upgrade to continue.');
      setShowUpgradePrompt(true);
      openPaymentModal();
      return;
    }

    setPaymentMessage('');
    setErrorMessage('');
    setShowUpgradePrompt(false);

    const session = await createNewSession({ incognito: true });

    if (!session) {
      setPaymentMessage('You are on the free tier. Upgrade to Premium to start a new chat.');
      setShowUpgradePrompt(true);
      openPaymentModal();
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentSessionId) return;

    const pendingMessage = chatInput;
    setChatInput('');

    await sendMessageToSession(currentSessionId, pendingMessage);
  };

  const handleChatComposerKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && chatInput.trim()) {
        sendMessage(e);
      }
    }
  };

  const handleRenameSession = async (sessionId) => {
    const currentSession = sessions.find((item) => item._id === sessionId);
    const nextTitle = window.prompt('Rename chat', currentSession?.title || currentSession?.fearTitle || 'Untitled Session');

    if (!nextTitle || !nextTitle.trim()) {
      return;
    }

    try {
      const result = await sessionAPI.update(sessionId, { title: nextTitle.trim() });
      const updatedSession = result?.session;
      if (!updatedSession) {
        return;
      }

      setSessions((prev) => prev.map((item) => (item._id === sessionId ? { ...item, ...updatedSession } : item)));
      setMenuOpenSessionId(null);
      setContextMenu({ visible: false, x: 0, y: 0, sessionId: null });
    } catch (error) {
      setErrorMessage(error.message || 'Failed to rename chat');
    }
  };

  const handleDeleteSession = async (sessionId) => {
    const confirmed = window.confirm('Delete this chat?');
    if (!confirmed) {
      return;
    }

    try {
      await sessionAPI.delete(sessionId);
      const refreshedSessions = sessions.filter((item) => item._id !== sessionId);
      setSessions(refreshedSessions);

      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
        setActionSummary([]);
        setIntensityScore('');
      }
      setMenuOpenSessionId(null);
      setContextMenu({ visible: false, x: 0, y: 0, sessionId: null });
    } catch (error) {
      setErrorMessage(error.message || 'Failed to delete chat');
    }
  };

  const openContextMenu = (event, sessionId) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      sessionId,
    });
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
        onBrandClick={() => onNavigate('home')}
        onLoginClick={() => onNavigate('login')}
        onSignupClick={() => onNavigate('signup')}
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={onLogout}
      />

      <main className={`portfolio-page-shell portfolio-chat-shell ${sidebarOpen ? 'portfolio-chat-shell-open' : 'portfolio-chat-shell-collapsed'}`}>
        <aside className={`portfolio-chat-sidebar ${sidebarOpen ? '' : 'portfolio-chat-sidebar-collapsed'}`}>
          <div className="chat-sidebar-shell">
            <div className="chat-sidebar-top">
              <button
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="chat-icon-button"
                title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              >
                {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </button>
              {sidebarOpen && <img src={logo} alt="BeyondFear" className="chat-sidebar-logo" />}
            </div>

            <button
              onClick={createNewSession}
              className="chat-new-chat-btn"
              disabled={creatingSession}
              title="Start new chat"
            >
              <Plus className="h-4 w-4" />
              {sidebarOpen && <span>{creatingSession ? 'Creating...' : 'New chat'}</span>}
            </button>

            <button
              onClick={handleIncognitoChat}
              className="chat-incognito-btn"
              disabled={creatingSession || loading}
              title="Start incognito chat"
            >
              <Shield className="h-4 w-4" />
              {sidebarOpen && <span>Incognito chat</span>}
            </button>

            <button
              onClick={() => onNavigate('dashboard')}
              className="chat-incognito-btn"
              title="Open dashboard"
            >
              <BarChart3 className="h-4 w-4" />
              {sidebarOpen && <span>Dashboard</span>}
            </button>

            {sidebarOpen ? (
              <SubscriptionBadge subscriptionStatus={subscriptionStatus} sessionsInfo={sessionsInfo} />
            ) : null}

            <div className="chat-sidebar-divider" />

            <div className="chat-session-list">
              {sessionsLoading ? (
                <div className="chat-sidebar-empty">Loading chats...</div>
              ) : sessions.length === 0 ? (
                <div className="chat-sidebar-empty">
                  {sidebarOpen ? 'No chats yet. Start your first one.' : '...'}
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session._id}
                    onClick={() => loadSessionById(session._id)}
                    onContextMenu={(event) => openContextMenu(event, session._id)}
                    className={`chat-session-item ${currentSessionId === session._id ? 'chat-session-item-active' : ''}`}
                    title={session.title || session.fearTitle || 'Untitled Session'}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        loadSessionById(session._id);
                      }
                    }}
                  >
                    {sidebarOpen ? (
                      <>
                        <div className="chat-session-title">{session.title || session.fearTitle || 'Untitled Session'}</div>
                      </>
                    ) : (
                      <div className="chat-session-dot" />
                    )}

                    {sidebarOpen && subscriptionStatus === 'premium' ? (
                      <span className="chat-session-menu-wrap">
                        <button
                          type="button"
                          className="chat-session-menu-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenuOpenSessionId((prev) => (prev === session._id ? null : session._id));
                          }}
                          aria-label="Open chat actions"
                        >
                          ⋯
                        </button>

                        {menuOpenSessionId === session._id ? (
                          <span className="chat-session-menu-dropdown">
                            <button
                              type="button"
                              className="chat-session-menu-item"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleRenameSession(session._id);
                              }}
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              className="chat-session-menu-item"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteSession(session._id);
                              }}
                            >
                              Delete
                            </button>
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            {contextMenu.visible && contextMenu.sessionId ? (
              <div
                className="chat-session-context-menu"
                style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="chat-session-menu-item"
                  onClick={() => {
                    if (subscriptionStatus === 'premium') {
                      handleRenameSession(contextMenu.sessionId);
                      return;
                    }

                    setContextMenu({ visible: false, x: 0, y: 0, sessionId: null });
                    setPaymentMessage('Rename is a premium feature. Upgrade to continue.');
                    openPaymentModal();
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="chat-session-menu-item"
                  onClick={() => {
                    if (subscriptionStatus === 'premium') {
                      handleDeleteSession(contextMenu.sessionId);
                      return;
                    }

                    setContextMenu({ visible: false, x: 0, y: 0, sessionId: null });
                    setPaymentMessage('Delete is a premium feature. Upgrade to continue.');
                    openPaymentModal();
                  }}
                >
                  Delete
                </button>
                {subscriptionStatus !== 'premium' ? (
                  <button
                    type="button"
                    className="chat-session-menu-item"
                    onClick={() => {
                      setContextMenu({ visible: false, x: 0, y: 0, sessionId: null });
                      setPaymentMessage('Rename and delete are premium features. Upgrade to continue.');
                      openPaymentModal();
                    }}
                  >
                    Upgrade to Premium
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </aside>

        <section className="portfolio-chat-main">
          {!currentSessionId ? (
            <section className="portfolio-chat-home">
              <div className="portfolio-chat-home-inner portfolio-card">
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
                      value={landingInput}
                      onChange={(e) => setLandingInput(e.target.value)}
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
                    onClick={openPaymentModal}
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
            <section className="portfolio-chat-thread portfolio-card">
              <header className="chat-thread-header">
                <div>
                  <h2 className="chat-thread-title">
                    {sessions.find((session) => session._id === currentSessionId)?.title || 'Active conversation'}
                  </h2>
                  <p className="chat-thread-subtitle">Stay with one fear at a time. Shift+Enter adds a new line.</p>
                </div>
                <div className="chat-thread-complete">
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={intensityScore}
                    onChange={(e) => setIntensityScore(e.target.value)}
                    placeholder="Final intensity"
                    className="chat-intensity-input"
                  />
                  <Button variant="outline" size="sm" onClick={handleCompleteSession}>
                    Complete
                  </Button>
                </div>
              </header>

              {errorMessage && (
                <div className="chat-thread-error">
                  {errorMessage}
                </div>
              )}

              {actionSummary.length > 0 && (
                <div className="chat-thread-actions">
                  <strong>Suggested actions:</strong> {actionSummary.map((item) => item.title).join(', ')}
                </div>
              )}

              <div className="chat-thread-messages">
                {messages.length === 0 ? (
                  <div className="chat-thread-empty">
                    <div className="chat-thread-empty-inner">
                      <h4 className="chat-thread-empty-title">Start this conversation</h4>
                      <p className="chat-thread-empty-subtitle">
                        Share what's on your mind. What fear or limiting belief would you like to explore today?
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`chat-message-row ${msg.role === 'user' ? 'chat-message-row-user' : 'chat-message-row-assistant'}`}
                    >
                      <div
                        className={`chat-message-bubble ${msg.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}
                      >
                        <p className="chat-message-text">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}

                {loading && (
                  <div className="chat-message-row chat-message-row-assistant">
                    <div className="chat-message-bubble chat-message-assistant">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="chat-thread-composer">
                <textarea
                  placeholder="Share what's on your mind..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatComposerKeyDown}
                  disabled={loading}
                  className="chat-thread-textarea"
                  rows={2}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={loading || !chatInput.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </section>
          )}
        </section>
      </main>

      <PaymentModal
        open={paymentModalOpen && subscriptionStatus !== 'premium'}
        plans={paymentPlans}
        loading={paymentPlansLoading}
        paymentLoading={paymentLoading}
        selectedPlanType={selectedPlanType}
        onClose={() => setPaymentModalOpen(false)}
        onSelectPlan={(planType) => handleStartCheckout(planType)}
      />
    </div>
  );
};
