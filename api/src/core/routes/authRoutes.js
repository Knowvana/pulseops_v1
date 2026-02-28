// ============================================================================
// Auth Routes — PulseOps V1 API
//
// PURPOSE: Authentication endpoints — login, token refresh, logout, profile.
// Provides the platform-level auth baseline. The Auth module (future) will
// extend this with full user management UI, RBAC policies, and advanced flows.
//
// ENDPOINTS:
//   POST /auth/login     — Authenticate with email/password, returns JWT tokens
//   POST /auth/refresh   — Refresh an expired access token
//   POST /auth/logout    — Invalidate session (client-side token discard)
//   GET  /auth/me        — Get current authenticated user profile
//
// DEPENDENCIES:
//   - ../middleware/auth.js → token generation, password comparison, authenticate
//   - ../database/databaseService.js → user lookup
//   - ../../config/index.js → schema name
//   - ../../shared/loadJson.js → messages
// ============================================================================
import { Router } from 'express';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  comparePassword,
  hashPassword,
  authenticate,
} from '../middleware/auth.js';
import DatabaseService from '../database/databaseService.js';
import config from '../../config/index.js';
import { messages } from '../../shared/loadJson.js';
import logger from '../../shared/logger.js';

const router = Router();
const schema = config.database.schema || 'pulseops';

// ── POST /auth/login ─────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: { message: messages.errors.authCredentialsRequired || 'Email and password are required.' },
    });
  }

  try {
    const result = await DatabaseService.query(
      `SELECT id, email, name, role, password_hash, status FROM ${schema}.system_users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: messages.errors.authInvalidCredentials || 'Invalid email or password.' },
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: { message: messages.errors.authAccountInactive || 'Account is not active. Contact administrator.' },
      });
    }

    // If user has no password_hash yet (seeded user), hash the default and store it on first login
    if (!user.password_hash) {
      const defaultPassword = config.auth.defaultPassword || 'Infosys@123';
      if (password !== defaultPassword) {
        return res.status(401).json({
          success: false,
          error: { message: messages.errors.authInvalidCredentials || 'Invalid email or password.' },
        });
      }
      // Hash and store the password for future logins
      const hash = await hashPassword(defaultPassword);
      await DatabaseService.query(
        `UPDATE ${schema}.system_users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
        [hash, user.id]
      );
    } else {
      const isValid = await comparePassword(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: { message: messages.errors.authInvalidCredentials || 'Invalid email or password.' },
        });
      }
    }

    // Update last_login
    await DatabaseService.query(
      `UPDATE ${schema}.system_users SET last_login = NOW() WHERE id = $1`,
      [user.id]
    );

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    logger.info(messages.success.authLoginSuccess || 'User logged in', {
      userId: user.id,
      email: user.email,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: config.auth.jwtExpiresInSeconds,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (err) {
    logger.error(messages.errors.authLoginFailed || 'Login failed', {
      error: err.message,
      requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: { message: messages.errors.authLoginFailed || 'Login failed. Please try again.' },
    });
  }
});

// ── POST /auth/refresh ───────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: { message: messages.errors.authRefreshTokenRequired || 'Refresh token is required.' },
    });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);

    // Verify user still exists and is active
    const result = await DatabaseService.query(
      `SELECT id, email, name, role, status FROM ${schema}.system_users WHERE id = $1`,
      [decoded.userId]
    );

    const user = result.rows[0];
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: { message: messages.errors.authRefreshInvalid || 'Invalid refresh token or user no longer active.' },
      });
    }

    const newAccessToken = generateAccessToken(user);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: config.auth.jwtExpiresInSeconds,
      },
    });
  } catch (err) {
    logger.warn(messages.errors.authRefreshInvalid || 'Refresh token invalid', {
      error: err.message,
      requestId: req.requestId,
    });
    res.status(401).json({
      success: false,
      error: { message: messages.errors.authRefreshInvalid || 'Invalid or expired refresh token.' },
    });
  }
});

// ── POST /auth/logout ────────────────────────────────────────────────────────
router.post('/logout', authenticate, (req, res) => {
  // JWT is stateless — logout is handled client-side by discarding tokens.
  // Future Auth module can implement token blacklisting or session revocation.
  logger.info(messages.success.authLogoutSuccess || 'User logged out', {
    userId: req.user.userId,
    requestId: req.requestId,
  });

  res.json({
    success: true,
    data: { message: messages.success.authLogoutSuccess || 'Logged out successfully.' },
  });
});

// ── GET /auth/me ─────────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await DatabaseService.query(
      `SELECT id, email, name, role, status, last_login, created_at FROM ${schema}.system_users WHERE id = $1`,
      [req.user.userId]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: messages.errors.authUserNotFound || 'User not found.' },
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { message: err.message },
    });
  }
});

export default router;
