import { decodeAuthToken } from '../utils/authTokens.js';

export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = decodeAuthToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    const statusCode = error.statusCode || 401;
    return res.status(statusCode).json({ error: error.message || 'Invalid token' });
  }
};

export const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    try {
      const decoded = decodeAuthToken(token);
      req.user = decoded;
    } catch (error) {
      // Invalid token but not required
    }
  }

  next();
};
