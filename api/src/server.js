// ============================================================================
// Server Entry Point — PulseOps V1 API
//
// PURPOSE: Starts the Express server with graceful shutdown support.
// Separated from app.js for testability.
//
// USAGE:
//   node src/server.js
//   nodemon src/server.js (development)
// ============================================================================
import createApp from './app.js';
import config from './config/index.js';
import logger from './shared/logger.js';
import DatabaseService from './core/database/databaseService.js';
import { messages } from './shared/loadJson.js';

const app = createApp();
const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(messages.info.serverStarted.replace('{port}', PORT));
  logger.info(`API prefix: ${config.apiPrefix}`);
  logger.info(`CORS origin: ${config.cors.origin}`);
  logger.info(`Modules dir: ${config.modulesDir}`);
});

// ── Graceful Shutdown ───────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} received. ${messages.info.serverShutdown}`);
  server.close(async () => {
    await DatabaseService.shutdown();
    logger.info(messages.info.databasePoolClosed);
    process.exit(0);
  });
  // Force shutdown after 10s
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
