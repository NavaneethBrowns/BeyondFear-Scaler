import jwt from 'jwt-simple';

const DEFAULT_TOKEN_LIFETIME_DAYS = 7;

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw { statusCode: 500, message: 'JWT secret is not configured' };
  }

  return secret;
};

export const getAuthTokenLifetimeSeconds = () => {
  const configuredDays = Number.parseInt(process.env.JWT_EXPIRES_IN_DAYS || '', 10);

  if (Number.isInteger(configuredDays) && configuredDays > 0) {
    return configuredDays * 24 * 60 * 60;
  }

  return DEFAULT_TOKEN_LIFETIME_DAYS * 24 * 60 * 60;
};

export const createAuthToken = (userId) => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresIn = getAuthTokenLifetimeSeconds();
  const payload = {
    userId: userId.toString(),
    iat: issuedAt,
    exp: issuedAt + expiresIn,
  };

  return {
    token: jwt.encode(payload, getJwtSecret()),
    expiresAt: new Date((issuedAt + expiresIn) * 1000).toISOString(),
  };
};

export const decodeAuthToken = (token) => {
  const decoded = jwt.decode(token, getJwtSecret());

  if (!decoded?.userId) {
    throw { statusCode: 401, message: 'Invalid token' };
  }

  if (decoded.exp && Math.floor(Date.now() / 1000) >= decoded.exp) {
    throw { statusCode: 401, message: 'Token expired' };
  }

  return decoded;
};