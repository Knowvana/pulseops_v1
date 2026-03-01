// ============================================================================
// Authentication Middleware — PulseOps V1 API
//
// PURPOSE: JWT-based authentication and role-based authorization.
// Provides platform-level security baseline that the Auth module will extend.
//
// FEATURES:
//   - JWT access token validation (Bearer scheme)
//   - Token payload extraction (userId, email, role)
//   - Role-based route protection (requireRole middleware)
//   - Token generation (access + refresh)
//   - Password hashing with bcrypt
//
// DEPENDENCIES:
//   - jsonwebtoken, bcryptjs (npm packages)
//   - config (app config with JWT secret, expiry)
// ============================================================================
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from '../../config/index.js';
import logger from '../../shared/logger.js';
import { messages } from '../../shared/loadJson.js';

const JWT_SECRET = config.auth.jwtSecret;
const JWT_EXPIRES_IN = config.auth.jwtExpiresIn;
const REFRESH_SECRET = config.auth.refreshSecret;
const REFRESH_EXPIRES_IN = config.auth.refreshExpiresIn;
const BCRYPT_ROUNDS = config.auth.bcryptRounds;

// ── Token Generation ─────────────────────────────────────────────────────────

/**
 * Generate an access token for a user.
 * @param {Object} user - { id, email, name, role }
 * @returns {string} JWT access token
 */
export function generateAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Generate a refresh token for a user.
 * @param {Object} user - { id, email }
 * @returns {string} JWT refresh token
 */
export function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, type: 'refresh' },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

/**
 * Verify and decode an access token.
 * @param {string} token - JWT token string
 * @returns {Object} Decoded payload
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Verify and decode a refresh token.
 * @param {string} token - JWT refresh token string
 * @returns {Object} Decoded payload
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

// ── Password Hashing ─────────────────────────────────────────────────────────

/**
 * Hash a plaintext password with bcrypt.
 * @param {string} password - Plaintext password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compare a plaintext password with a bcrypt hash.
 * @param {string} password - Plaintext password
 * @param {string} hash - Bcrypt hash
 * @returns {Promise<boolean>} True if match
 */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ── Authentication Middleware ─────────────────────────────────────────────────

/**
 * Express middleware: Authenticate requests via Dual Auth (Bearer Header or HttpOnly Cookie).
 * Attaches decoded user to req.user on success.
 * Returns 401 if token is missing, invalid, or expired.
 */
export function authenticate(req, res, next) {
  let token = null;

  // 1. Check Authorization Header (Bearer) - For Swagger/Postman
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } 
  // 2. Fallback to HttpOnly Cookie - For Frontend
  else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: messages.errors.authTokenMissing || 'Authentication required. Provide a Bearer token or cookie.' },
    });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    logger.warn(messages.errors.authTokenInvalid || 'Invalid auth token', {
      error: err.message,
      requestId: req.requestId,
    });
    return res.status(401).json({
      success: false,
      error: {
        message: isExpired
          ? (messages.errors.authTokenExpired || 'Token expired. Please login again.')
          : (messages.errors.authTokenInvalid || 'Invalid authentication token.'),
        code: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      },
    });
  }
}

// ── Authorization Middleware ──────────────────────────────────────────────────

/**
 * Express middleware factory: Require the authenticated user to have
 * one of the specified roles.
 * @param {...string} roles - Allowed roles (e.g. 'super_admin', 'admin')
 * @returns {Function} Express middleware
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: messages.errors.authTokenMissing || 'Authentication required.' },
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(messages.errors.authForbidden || 'Forbidden access attempt', {
        userId: req.user.userId,
        role: req.user.role,
        requiredRoles: roles,
        path: req.originalUrl,
        requestId: req.requestId,
      });
      return res.status(403).json({
        success: false,
        error: { message: messages.errors.authForbidden || 'Insufficient permissions.' },
      });
    }

    next();
  };
}
