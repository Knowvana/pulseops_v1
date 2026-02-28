// ============================================================================
// Express App Factory — PulseOps V1 API
//
// PURPOSE: Creates and configures the Express application with middleware
// chain and route registration. Separated from server.js for testability.
//
// MIDDLEWARE CHAIN:
//   1. Security headers (Helmet.js)
//   2. Request ID tracking (UUID per request)
//   3. CORS (credentials: true for HttpOnly cookies)
//   4. Rate limiting (general + auth-specific)
//   5. JSON body parser
//   6. Input sanitization
//   7. Request logging
//   8. Public routes (health, auth/login, swagger, module bundles)
//   9. JWT authentication (all other routes)
//  10. Protected routes (database, modules, config)
//  11. 404 handler
//  12. Global error handler
//
// SECURITY:
//   - Helmet.js: CSP, HSTS, XSS, clickjacking protection
//   - Rate limiting: 100 req/15min (general), 10 req/15min (auth)
//   - JWT: Access token (24h) + Refresh token (7d)
//   - bcrypt: Password hashing with configurable rounds
//   - Input sanitization: XSS pattern stripping
//   - Request ID: UUID traceability in all logs
// ============================================================================
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import config from './config/index.js';
import logger from './shared/logger.js';
import { loadJson } from './shared/loadJson.js';

// Security middleware
import {
  helmetMiddleware,
  generalRateLimiter,
  authRateLimiter,
  requestIdMiddleware,
  inputSanitizer,
} from './core/middleware/security.js';

// Auth middleware
import { authenticate } from './core/middleware/auth.js';

// Routes
import healthRoutes from './core/routes/healthRoutes.js';
import authRoutes from './core/routes/authRoutes.js';
import logsRoutes from './core/routes/logsRoutes.js';
import usersRoutes from './core/routes/usersRoutes.js';
import databaseRoutes from './core/routes/databaseRoutes.js';
import moduleRoutes from './core/routes/moduleRoutes.js';
import moduleBundleRoutes from './core/routes/moduleBundleRoutes.js';
import configRoutes from './core/routes/configRoutes.js';

// Swagger spec
const swaggerSpec = loadJson('swagger.json');

export default function createApp() {
  const app = express();
  const prefix = config.apiPrefix || '/api';

  // ── Security Middleware ─────────────────────────────────────────────────
  app.use(helmetMiddleware);
  app.use(requestIdMiddleware);
  app.use(cors(config.cors));
  app.use(generalRateLimiter);
  app.use(express.json({ limit: '10mb' }));
  app.use(inputSanitizer);

  // Request logging (includes request ID)
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(`[${req.requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    });
    next();
  });

  // ── Swagger API Explorer (public) ──────────────────────────────────────
  app.use('/swagger-ui', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'PulseOps V1 API Explorer',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
    },
  }));
  app.get('/api-docs/swagger.json', (req, res) => res.json(swaggerSpec));

  // ── Public Routes (no auth required) ───────────────────────────────────
  app.use(`${prefix}/health`, healthRoutes);
  app.use(`${prefix}/auth`, authRateLimiter, authRoutes);
  app.use(`${prefix}/modules/bundle`, moduleBundleRoutes);

  // ── JWT Authentication Gate ────────────────────────────────────────────
  // Logs sync requires auth (frontend suppresses session-expired during sync)
  app.use(`${prefix}/logs`, authenticate, logsRoutes);

  // Users endpoints require auth
  app.use(`${prefix}/users`, authenticate, usersRoutes);

  // Module management (install/enable/disable) always requires auth.
  app.use(`${prefix}/modules`, authenticate, moduleRoutes);

  // Database + Config routes apply authenticate selectively per-route
  // inside their own routers (setup/status routes are public for bootstrapping).
  app.use(`${prefix}/database`, databaseRoutes);
  app.use(`${prefix}/config`, configRoutes);

  // ── 404 Handler ───────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({ success: false, error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
  });

  // ── Global Error Handler ──────────────────────────────────────────────
  app.use((err, req, res, _next) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack, requestId: req.requestId });
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  });

  return app;
}
