const API_BASE_URL = 'http://localhost:5000/api';

export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API Error');
  }

  return response.json();
};

// Auth API
export const authAPI = {
  signup: (email, password) =>
    apiCall('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email, password) =>
    apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getProfile: () => apiCall('/auth/me'),
};

// Session API
export const sessionAPI = {
  create: () =>
    apiCall('/sessions', { method: 'POST', body: JSON.stringify({}) }),

  list: () => apiCall('/sessions'),

  get: (sessionId) => apiCall(`/sessions/${sessionId}`),

  update: (sessionId, data) =>
    apiCall(`/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (sessionId) =>
    apiCall(`/sessions/${sessionId}`, { method: 'DELETE' }),
};

// Message API
export const messageAPI = {
  send: (sessionId, message) =>
    apiCall('/messages/send', {
      method: 'POST',
      body: JSON.stringify({ sessionId, message }),
    }),

  sendMock: (sessionId, message) =>
    apiCall('/messages/mock', {
      method: 'POST',
      body: JSON.stringify({ sessionId, message }),
    }),
};

// Payment API
export const paymentAPI = {
  createOrder: ({ amount, currency = 'INR', receipt }) =>
    apiCall('/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount, currency, receipt }),
    }),

  verifyPayment: ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) =>
    apiCall('/payments/verify', {
      method: 'POST',
      body: JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature }),
    }),

  getStatus: () => apiCall('/payments/status'),
};
