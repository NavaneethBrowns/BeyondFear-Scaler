const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
    const apiError = new Error(error.error || 'API Error');
    apiError.status = response.status;
    apiError.details = error;
    throw apiError;
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
  create: (data = {}) =>
    apiCall('/sessions', { method: 'POST', body: JSON.stringify(data) }),

  list: () => apiCall('/sessions'),

  get: (sessionId) => apiCall(`/sessions/${sessionId}`),

  update: (sessionId, data) =>
    apiCall(`/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  complete: (sessionId, fearIntensity) =>
    apiCall(`/sessions/${sessionId}/complete`, {
      method: 'PATCH',
      body: JSON.stringify(
        fearIntensity !== undefined ? { fearIntensity } : {}
      ),
    }),

  updateIntensity: (sessionId, data) =>
    apiCall(`/sessions/${sessionId}/intensity`, {
      method: 'PATCH',
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
  getPlans: () =>
    apiCall('/payments/plans'),

  createOrder: ({ planType }) =>
    apiCall('/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({ planType }),
    }),

  verifyPayment: ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) =>
    apiCall('/payments/verify', {
      method: 'POST',
      body: JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature }),
    }),

  getStatus: () => apiCall('/payments/status'),

  recordFailure: ({ orderId, reason }) =>
    apiCall('/payments/record-failure', {
      method: 'POST',
      body: JSON.stringify({ orderId, reason }),
    }),
};
