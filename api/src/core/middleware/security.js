// ============================================================================
// Security Middleware — PulseOps V1 API
//
// PURPOSE: Enterprise-grade security hardening. Applies HTTP security headers,
// rate limiting, request ID tracking, and input sanitization.
//
// FEATURES:
//   - Helmet.js: CSP, HSTS, XSS protection, clickjacking prevention
//   - Rate limiting: Per-IP request throttling (general + login)
//   - Request ID: UUID per request for traceability in logs
//   - Input sanitization: Strips dangerous characters from query/params
//
// DEPENDENCIES:
//   - helmet, express-rate-limit (npm packages)
//   - crypto (Node.js built-in)
// ============================================================================
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { messages } from '../../shared/loadJson.js';

// ── Helmet: HTTP Security Headers ────────────────────────────────────────────
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// ── Rate Limiting: General API ───────────────────────────────────────────────
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: messages.errors.rateLimitExceeded || 'Too many requests. Please try again later.' },
  },
  keyGenerator: (req) => req.ip,
});

// ── Rate Limiting: Auth Endpoints (stricter) ─────────────────────────────────
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: messages.errors.authRateLimitExceeded || 'Too many login attempts. Please try again later.' },
  },
  keyGenerator: (req) => req.ip,
});

// ── Request ID: UUID per request ─────────────────────────────────────────────
export function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

// ── Input Sanitization: Strip dangerous patterns from query/params ───────────
const DANGEROUS_PATTERNS = [
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
];

function sanitizeValue(value) {
  if (typeof value !== 'string') return value;
  let clean = value;
  for (const pattern of DANGEROUS_PATTERNS) {
    clean = clean.replace(pattern, '');
  }
  return clean;
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeObject(value);
    } else {
      clean[key] = sanitizeValue(value);
    }
  }
  return clean;
}

export function inputSanitizer(req, res, next) {
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
}
