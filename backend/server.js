import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDB } from './src/config/database.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { requestLogger } from './src/middleware/requestLogger.js';

// Import routes
import authRoutes from './src/routes/auth.routes.js';
import sessionRoutes from './src/routes/session.routes.js';
import actionLogRoutes from './src/routes/actionLog.routes.js';
import paymentRoutes from './src/routes/payment.routes.js';
import messageRoutes from './src/routes/message.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const configuredFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

const allowedDevOrigins = new Set([
  configuredFrontendUrl,
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
]);

const isAllowedDevOrigin = (origin = '') => {
  if (allowedDevOrigins.has(origin)) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1):(\d+)$/.test(origin);
};

// ==========================================
// MIDDLEWARE
// ==========================================

// Security middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || isAllowedDevOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging
app.use(requestLogger);

// ==========================================
// ROUTES
// ==========================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api', actionLogRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use(errorHandler);

// ==========================================
// SERVER STARTUP
// ==========================================

async function startServer() {
  try {
    await connectDB();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

export default app;
