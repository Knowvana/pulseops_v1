// ============================================================================
// API Configuration — PulseOps V1
//
// PURPOSE: 12-factor config loader. All config comes from environment
// variables with sensible defaults. No hardcoded values.
// ============================================================================
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const configJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'app.json'), 'utf8'));

const config = {
  port: parseInt(process.env.PORT || configJson.server.port, 10),
  apiPrefix: process.env.API_PREFIX || configJson.server.apiPrefix,
  cors: {
    origin: process.env.CORS_ORIGIN || configJson.server.corsOrigin,
    credentials: true,
  },
  database: {
    host: process.env.DB_HOST || configJson.database.host,
    port: parseInt(process.env.DB_PORT || configJson.database.port, 10),
    database: process.env.DB_NAME || configJson.database.name,
    schema: process.env.DB_SCHEMA || configJson.database.schema,
    user: process.env.DB_USER || configJson.database.user,
    password: process.env.DB_PASSWORD || configJson.database.password,
    ssl: process.env.DB_SSL === 'true',
    max: parseInt(process.env.DB_POOL_MAX || configJson.database.maxPoolSize, 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || configJson.database.idleTimeoutMs, 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || configJson.database.connectionTimeoutMs, 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || configJson.logging.level,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || configJson.auth.jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || configJson.auth.jwtExpiresIn,
    jwtExpiresInSeconds: parseInt(process.env.JWT_EXPIRES_IN_SECONDS || configJson.auth.jwtExpiresInSeconds, 10),
    refreshSecret: process.env.JWT_REFRESH_SECRET || configJson.auth.refreshSecret,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || configJson.auth.refreshExpiresIn,
    refreshExpiresInSeconds: parseInt(process.env.JWT_REFRESH_EXPIRES_IN_SECONDS || configJson.auth.refreshExpiresInSeconds, 10),
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || configJson.auth.bcryptRounds, 10),
    defaultPassword: process.env.DEFAULT_PASSWORD || configJson.auth.defaultPassword,
  },
  modulesDir: process.env.MODULES_DIR || configJson.modules.hotDropDir,
};

export default config;
