import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card, CardBody, CardHeader } from '../components/Card';
import { Navbar } from '../components/Navbar';
import { Send, Plus } from 'lucide-react';
import { paymentAPI } from '../services/api';

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
const RAZORPAY_AMOUNT_PAISE = 29900;

export const ChatPage = ({ onNavigate, onLogout, isAuthenticated, user }) => {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('free');

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

  const createNewSession = () => {
    const newSession = {
      id: 'session_' + Date.now(),
      title: 'New Session - ' + new Date().toLocaleDateString(),
      createdAt: new Date(),
      messages: [],
    };
    setSessions([newSession, ...sessions]);
    setCurrentSession(newSession.id);
    setMessages([]);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !currentSession) return;

    setLoading(true);
    const userMessage = { role: 'user', content: input, timestamp: new Date() };
    setMessages([...messages, userMessage]);
    setInput('');

    try {
      // Mock API call - will be replaced with real Claude API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const aiResponse = {
        role: 'assistant',
        content: 'I hear you. That sounds challenging. Can you tell me more about what triggered this feeling today?',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Navbar
        onLoginClick={() => onNavigate('login')}
        onSignupClick={() => onNavigate('signup')}
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={onLogout}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 flex gap-6">
        {/* Sidebar: Sessions */}
        <div className="hidden md:block w-64 flex-shrink-0">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Sessions</h2>
                <button
                  onClick={createNewSession}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="space-y-2">
                {sessions.length === 0 ? (
                  <button
                    onClick={createNewSession}
                    className="w-full px-4 py-3 text-left text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                  >
                    + Start Your First Session
                  </button>
                ) : (
                  sessions.map(session => (
                    <button
                      key={session.id}
                      onClick={() => {
                        setCurrentSession(session.id);
                        setMessages(session.messages || []);
                      }}
                      className={`w-full px-4 py-3 text-left text-sm rounded-lg transition ${
                        currentSession === session.id
                          ? 'bg-indigo-100 text-indigo-900 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="truncate font-medium">{session.title}</div>
                      <div className="text-xs opacity-70">
                        {session.createdAt.toLocaleDateString()}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1">
          {!currentSession ? (
            <Card className="h-96 flex items-center justify-center">
              <CardBody className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Welcome to BeyondFear
                </h3>
                <p className="text-gray-600 mb-6">
                  Start a new session to begin your journey of identifying fears and taking action.
                </p>
                <div className="flex items-center justify-center gap-3 mb-5 flex-wrap">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleStartCheckout}
                    disabled={paymentLoading}
                  >
                    {subscriptionStatus === 'premium'
                      ? 'Premium Active'
                      : paymentLoading
                        ? 'Opening Checkout...'
                        : 'Upgrade to Premium'}
                  </Button>
                </div>
                {paymentMessage && (
                  <p className="text-sm text-gray-700 mb-4">{paymentMessage}</p>
                )}
                <Button
                  variant="action"
                  size="lg"
                  onClick={createNewSession}
                >
                  Start First Session
                </Button>
              </CardBody>
            </Card>
          ) : (
            <div className="flex flex-col h-96 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
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
