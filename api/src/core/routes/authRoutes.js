// ============================================================================
// Auth Routes — PulseOps V1 API
//
// PURPOSE: Authentication endpoints governed by the Auth Module.
// The active provider (json_file | database | social) determines how login
// is validated. Provider config is stored in auth-provider.json (always
// readable) and mirrored to system_config table when DB is available.
//
// ENDPOINTS (Public):
//   POST /auth/login      — Authenticate with email/password → JWT tokens
//   GET  /auth/config     — Get current auth provider configuration
//
// ENDPOINTS (Protected — JWT required):
//   POST /auth/refresh    — Refresh an expired access token
//   POST /auth/logout     — Logout (client discards token)
//   GET  /auth/me         — Get current authenticated user profile
//   POST /auth/config     — Save auth provider (super_admin only)
//
// PROVIDER ROUTING:
//   json_file  → validates against api/src/config/users.json
//   database   → validates against pulseops.system_users in PostgreSQL
//
// DEPENDENCIES:
//   - ../middleware/auth.js → JWT generation, verification, bcrypt, authenticate
//   - ../database/databaseService.js → DB user lookup (database provider only)
//   - ../../config/index.js → schema, auth config
//   - ../../shared/loadJson.js → messages, JSON file loader
// ============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Router } from 'express';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  comparePassword,
  hashPassword,
  authenticate,
  requireRole,
} from '../middleware/auth.js';
import DatabaseService from '../database/databaseService.js';
import config from '../../config/index.js';
import { messages } from '../../shared/loadJson.js';
import logger from '../../shared/logger.js';

const router = Router();
const schema = config.database.schema || 'pulseops';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_PROVIDER_FILE = path.resolve(__dirname, '../../config/auth-provider.json');
const USERS_FILE = path.resolve(__dirname, '../../config/users.json');

// ── Auth Provider Helpers ────────────────────────────────────────────────────

/**
 * Read auth provider from DB (system_config key: auth_provider) first,
 * fall back to auth-provider.json file if DB is unavailable or not initialized.
 * @returns {Promise<string>} Provider string: 'json_file' | 'database' | 'social'
 */
async function getAuthProvider() {
  try {
    const result = await DatabaseService.query(
      `SELECT value FROM ${schema}.system_config WHERE key = 'auth_provider' LIMIT 1`
    );
    if (result.rows[0]?.value?.provider) {
      return result.rows[0].value.provider;
    }
  } catch {
    // DB not available — fall back to file
  }
  try {
    const raw = fs.readFileSync(AUTH_PROVIDER_FILE, 'utf8');
    return JSON.parse(raw).provider || 'json_file';
  } catch {
    return 'json_file';
  }
}

/**
 * Persist provider to auth-provider.json file AND system_config table (if DB ready).
 * @param {string} provider
 */
async function saveAuthProvider(provider) {
  const raw = fs.readFileSync(AUTH_PROVIDER_FILE, 'utf8');
  const existing = JSON.parse(raw);
  existing.provider = provider;
  fs.writeFileSync(AUTH_PROVIDER_FILE, JSON.stringify(existing, null, 2), 'utf8');

  try {
    await DatabaseService.query(
      `INSERT INTO ${schema}.system_config (key, value, description, updated_at)
       VALUES ('auth_provider', $1, 'Active authentication provider', NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [JSON.stringify({ provider })]
    );
  } catch {
    // DB not available — file save is sufficient
  }
}

/**
 * Authenticate against users.json (json_file provider).
 */
function loginWithJsonFile(email, password) {
  const raw = fs.readFileSync(USERS_FILE, 'utf8');
  const { users } = JSON.parse(raw);
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

  if (!user) return { error: 'INVALID_CREDENTIALS' };
  if (user.status !== 'active') return { error: 'ACCOUNT_INACTIVE' };
  if (user.password !== password) return { error: 'INVALID_CREDENTIALS' };

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      authMethod: 'json_file',
    },
  };
}

/**
 * Authenticate against PostgreSQL system_users (database provider).
 */
async function loginWithDatabase(email, password) {
  const result = await DatabaseService.query(
    `SELECT id, email, name, role, password_hash, status FROM ${schema}.system_users WHERE email = $1`,
    [email.toLowerCase().trim()]
  );

  const user = result.rows[0];
  if (!user) return { error: 'INVALID_CREDENTIALS' };
  if (user.status !== 'active') return { error: 'ACCOUNT_INACTIVE' };

  if (!user.password_hash) {
    const defaultPassword = config.auth.defaultPassword || 'Infosys@123';
    if (password !== defaultPassword) return { error: 'INVALID_CREDENTIALS' };
    const hash = await hashPassword(defaultPassword);
    await DatabaseService.query(
      `UPDATE ${schema}.system_users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [hash, user.id]
    );
  } else {
    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) return { error: 'INVALID_CREDENTIALS' };
  }

  await DatabaseService.query(
    `UPDATE ${schema}.system_users SET last_login = NOW() WHERE id = $1`,
    [user.id]
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      authMethod: 'database',
    },
  };
}

// ── GET /auth/config (Public) ─────────────────────────────────────────────────
router.get('/config', async (req, res) => {
  try {
    const raw = fs.readFileSync(AUTH_PROVIDER_FILE, 'utf8');
    const fileConfig = JSON.parse(raw);
    const activeProvider = await getAuthProvider();

    logger.info(messages.success.authProviderLoaded || 'Auth provider config loaded', {
      provider: activeProvider, requestId: req.requestId,
    });

    res.json({
      success: true,
      data: {
        provider: activeProvider,
        availableProviders: fileConfig.availableProviders || ['json_file', 'database', 'social'],
        social: fileConfig.social || { enabled: false },
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { message: messages.errors.authProviderSaveFailed || 'Failed to load auth config.' },
    });
  }
});

// ── POST /auth/config (Protected — super_admin only) ─────────────────────────
router.post('/config', authenticate, requireRole('super_admin'), async (req, res) => {
  const { provider } = req.body;
  const validProviders = ['json_file', 'database', 'social'];

  if (!provider || !validProviders.includes(provider)) {
    return res.status(400).json({
      success: false,
      error: { message: messages.errors.authProviderInvalid || 'Invalid provider.', code: 'INVALID_PROVIDER' },
    });
  }

  if (provider === 'database') {
    try {
      const status = await DatabaseService.getSchemaStatus();
      if (!status.initialized || !status.hasDefaultData) {
        return res.status(400).json({
          success: false,
          error: { message: messages.errors.authProviderDbNotReady, code: 'DB_NOT_READY' },
        });
      }
    } catch {
      return res.status(400).json({
        success: false,
        error: { message: messages.errors.authProviderDbNotReady, code: 'DB_NOT_READY' },
      });
    }
  }

  try {
    await saveAuthProvider(provider);
    logger.info(messages.success.authProviderSaved || 'Auth provider changed', {
      provider, userId: req.user.userId, requestId: req.requestId,
    });
    res.json({
      success: true,
      data: { provider, message: messages.success.authProviderSaved },
    });
  } catch (err) {
    logger.error(messages.errors.authProviderSaveFailed || 'Auth provider save failed', {
      error: err.message, requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: { message: messages.errors.authProviderSaveFailed, code: 'SAVE_FAILED' },
    });
  }
});

// ── POST /auth/login (Public) ─────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: { message: messages.errors.authCredentialsRequired, code: 'CREDENTIALS_REQUIRED' },
    });
  }

  try {
    const provider = await getAuthProvider();
    let result;

    if (provider === 'json_file') {
      result = loginWithJsonFile(email, password);
    } else if (provider === 'database') {
      result = await loginWithDatabase(email, password);
    } else {
      return res.status(400).json({
        success: false,
        error: { message: messages.errors.authProviderInvalid, code: 'UNSUPPORTED_PROVIDER' },
      });
    }

    if (result.error === 'INVALID_CREDENTIALS') {
      return res.status(401).json({
        success: false,
        error: { message: messages.errors.authInvalidCredentials, code: 'INVALID_CREDENTIALS' },
      });
    }

    if (result.error === 'ACCOUNT_INACTIVE') {
      return res.status(403).json({
        success: false,
        error: { message: messages.errors.authAccountInactive, code: 'ACCOUNT_INACTIVE' },
      });
    }

    const accessToken = generateAccessToken(result.user);
    const refreshToken = generateRefreshToken(result.user);

    // Set HttpOnly cookies for frontend security
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: (config.auth.jwtExpiresInSeconds || 86400) * 1000,
    };

    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    logger.info(messages.success.authLoginSuccess || 'User authenticated', {
      userId: result.user.id, email: result.user.email,
      provider, requestId: req.requestId,
    });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: config.auth.jwtExpiresInSeconds,
        user: result.user,
      },
    });
  } catch (err) {
    logger.error(messages.errors.authLoginFailed || 'Login failed', {
      error: err.message, requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: { message: messages.errors.authLoginFailed, code: 'SERVER_ERROR' },
    });
  }
});

// ── POST /auth/refresh (Protected) ───────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: { message: messages.errors.authRefreshTokenRequired },
    });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const provider = await getAuthProvider();
    let user;

    if (provider === 'json_file') {
      const raw = fs.readFileSync(USERS_FILE, 'utf8');
      const { users } = JSON.parse(raw);
      user = users.find(u => u.id === decoded.userId && u.status === 'active');
      if (user) user = { id: user.id, email: user.email, name: user.name, role: user.role };
    } else {
      const result = await DatabaseService.query(
        `SELECT id, email, name, role, status FROM ${schema}.system_users WHERE id = $1`,
        [decoded.userId]
      );
      const dbUser = result.rows[0];
      if (dbUser?.status === 'active') user = dbUser;
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: messages.errors.authRefreshInvalid },
      });
    }

    res.json({
      success: true,
      data: {
        accessToken: generateAccessToken(user),
        expiresIn: config.auth.jwtExpiresInSeconds,
      },
    });
  } catch (err) {
    logger.warn(messages.errors.authRefreshInvalid || 'Refresh token invalid', {
      error: err.message, requestId: req.requestId,
    });
    res.status(401).json({
      success: false,
      error: { message: messages.errors.authRefreshInvalid },
    });
  }
});

// ── POST /auth/logout (Protected) ────────────────────────────────────────────
router.post('/logout', authenticate, (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  logger.info(messages.success.authLogoutSuccess || 'User logged out', {
    userId: req.user.userId, requestId: req.requestId,
  });
  res.json({
    success: true,
    data: { message: messages.success.authLogoutSuccess },
  });
});

// ── GET /auth/me (Protected) ─────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const provider = await getAuthProvider();

    if (provider === 'json_file') {
      const raw = fs.readFileSync(USERS_FILE, 'utf8');
      const { users } = JSON.parse(raw);
      const user = users.find(u => u.id === req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { message: messages.errors.authUserNotFound },
        });
      }
      return res.json({
        success: true,
        data: { id: user.id, email: user.email, name: user.name, role: user.role, authMethod: 'json_file' },
      });
    }

    const result = await DatabaseService.query(
      `SELECT id, email, name, role, status, last_login, created_at FROM ${schema}.system_users WHERE id = $1`,
      [req.user.userId]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: messages.errors.authUserNotFound },
      });
    }
    res.json({ success: true, data: { ...user, authMethod: 'database' } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

export default router;
