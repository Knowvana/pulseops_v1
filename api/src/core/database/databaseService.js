// ============================================================================
// Database Service — PulseOps V1 API
//
// PURPOSE: Core database operations using pg (node-postgres). Handles
// connection pooling, schema management, health checks, and data seeding.
// Uses a CUSTOM SCHEMA (not public) for all tables.
//
// SCHEMA: All tables are created under the configured schema (default: pulseops)
// ============================================================================
import pg from 'pg';
import config from '../../config/index.js';
import logger from '../../shared/logger.js';
import { messages } from '../../shared/loadJson.js';

const { Pool } = pg;

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      max: config.database.max,
      idleTimeoutMillis: config.database.idleTimeoutMillis,
      connectionTimeoutMillis: config.database.connectionTimeoutMillis,
    });
    pool.on('error', (err) => {
      logger.error('Database pool error (idle client)', { error: err.message });
    });
  }
  return pool;
}

const schema = config.database.schema || 'pulseops';

const DatabaseService = {
  /**
   * Create the target database if it does not exist.
   * Connects to the default 'postgres' database to run CREATE DATABASE.
   */
  async createDatabase() {
    const adminPool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: 'postgres',
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
    });
    const client = await adminPool.connect();
    try {
      const dbName = config.database.database;
      const check = await client.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]
      );
      if (check.rows.length === 0) {
        await client.query(`CREATE DATABASE "${dbName}"`);
        logger.info(messages.success.dbCreated || `Database '${dbName}' created.`);
        return { created: true, database: dbName };
      }
      return { created: false, database: dbName, message: 'Database already exists.' };
    } finally {
      client.release();
      await adminPool.end();
    }
  },

  /**
   * Drop (delete) the target database entirely.
   * Terminates all active connections first so the DROP succeeds.
   * Connects to the default 'postgres' database to run DROP DATABASE.
   */
  async dropDatabase() {
    const adminPool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: 'postgres',
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
    });
    const client = await adminPool.connect();
    try {
      const dbName = config.database.database;
      const check = await client.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]
      );
      if (check.rows.length === 0) {
        return { deleted: false, database: dbName, message: 'Database does not exist.' };
      }
      // Terminate all active connections to the target DB before dropping
      await client.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [dbName]
      );
      await client.query(`DROP DATABASE "${dbName}"`);
      // Reset the shared pool so it reconnects if DB is recreated
      if (pool) { await pool.end().catch(() => {}); pool = null; }
      logger.info(messages.success.dbDeleted || `Database '${dbName}' dropped.`);
      return { deleted: true, database: dbName };
    } finally {
      client.release();
      await adminPool.end();
    }
  },

  /**
   * Test connection to the database and return latency + version info.
   */
  async testConnection() {
    const start = Date.now();
    const client = await getPool().connect();
    try {
      const result = await client.query('SELECT version()');
      const latency = Date.now() - start;
      return {
        connected: true,
        latencyMs: latency,
        dbVersion: result.rows[0]?.version || null,
        message: messages.success.dbConnected,
      };
    } finally {
      client.release();
    }
  },

  /**
   * Check schema status: is the schema created? Are tables initialized?
   */
  async getSchemaStatus() {
    const client = await getPool().connect();
    try {
      // Check if schema exists
      const schemaCheck = await client.query(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
        [schema]
      );
      if (schemaCheck.rows.length === 0) {
        return { connected: true, initialized: false, hasDefaultData: false, tables: [] };
      }

      // Check for core tables
      const tableCheck = await client.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`,
        [schema]
      );
      const tables = tableCheck.rows.map(r => r.table_name);
      const coreTables = ['system_users', 'system_config', 'system_modules'];
      const initialized = coreTables.every(t => tables.includes(t));

      // Check for default data
      let hasDefaultData = false;
      if (initialized) {
        const userCheck = await client.query(`SELECT COUNT(*) FROM ${schema}.system_users`);
        hasDefaultData = parseInt(userCheck.rows[0].count, 10) > 0;
      }

      return { connected: true, initialized, hasDefaultData, tables };
    } finally {
      client.release();
    }
  },

  /**
   * Create the core database schema and tables.
   */
  async createSchema() {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');

      // Create schema if not exists
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);

      // Core tables
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.system_users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255),
          name VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'user',
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          last_login TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.system_config (
          id SERIAL PRIMARY KEY,
          key VARCHAR(255) UNIQUE NOT NULL,
          value JSONB NOT NULL DEFAULT '{}',
          description TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.system_modules (
          id SERIAL PRIMARY KEY,
          module_id VARCHAR(100) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
          description TEXT,
          is_core BOOLEAN DEFAULT FALSE,
          enabled BOOLEAN DEFAULT FALSE,
          schema_initialized BOOLEAN DEFAULT FALSE,
          "order" INTEGER DEFAULT 99,
          installed_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.system_logs (
          id SERIAL PRIMARY KEY,
          level VARCHAR(10) NOT NULL,
          source VARCHAR(100),
          message TEXT NOT NULL,
          data JSONB,
          user_id INTEGER,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      await client.query('COMMIT');
      logger.info(messages.success.schemaCreated);

      return { success: true, message: messages.success.schemaCreated, tables: ['system_users', 'system_config', 'system_modules', 'system_logs'] };
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(messages.errors.schemaInitFailed, { error: err.message });
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Load default seed data (admin user, core module registration).
   */
  async loadDefaultData() {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');

      // Default admin user (password: Infosys@123 — plaintext for now, backend should hash)
      await client.query(`
        INSERT INTO ${schema}.system_users (email, name, role, status)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO NOTHING
      `, ['admin@test.com', 'Core Admin', 'super_admin', 'active']);

      // Register core modules
      await client.query(`
        INSERT INTO ${schema}.system_modules (module_id, name, version, description, is_core, enabled, schema_initialized, "order")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (module_id) DO NOTHING
      `, ['platform_admin', 'Admin', '1.0.0', 'Platform dashboard, module management, and global settings', true, true, true, 0]);

      await client.query(`
        INSERT INTO ${schema}.system_modules (module_id, name, version, description, is_core, enabled, schema_initialized, "order")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (module_id) DO NOTHING
      `, ['auth', 'Authentication', '1.0.0', 'Global authentication, authorization, user management, RBAC, session control, and security audit', true, true, true, 1]);

      await client.query('COMMIT');
      logger.info(messages.success.defaultDataLoaded);

      return { success: true, message: messages.success.defaultDataLoaded };
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(messages.errors.dbInitFailed, { error: err.message });
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Clean default data (remove seeded records).
   */
  async cleanDefaultData() {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM ${schema}.system_users WHERE email = 'admin@test.com'`);
      await client.query(`DELETE FROM ${schema}.system_modules WHERE is_core = true`);
      await client.query('COMMIT');
      return { success: true, message: messages.success.defaultDataCleaned };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Wipe all tables in the schema (destructive!).
   */
  async wipeDatabase() {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await client.query('COMMIT');
      logger.info(messages.success.dbWiped);
      return { success: true, message: messages.success.dbWiped };
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(messages.errors.dbWipeFailed, { error: err.message });
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Get database stats (table counts, sizes).
   */
  async getStats() {
    const client = await getPool().connect();
    try {
      const result = await client.query(`
        SELECT table_name,
          pg_size_pretty(pg_total_relation_size(quote_ident(table_schema) || '.' || quote_ident(table_name))) as size
        FROM information_schema.tables
        WHERE table_schema = $1
        ORDER BY table_name
      `, [schema]);
      return { tables: result.rows };
    } finally {
      client.release();
    }
  },

  /**
   * Execute a query using the shared pool. Returns pg result object.
   * @param {string} text - SQL query text
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} pg result { rows, rowCount, ... }
   */
  async query(text, params) {
    const client = await getPool().connect();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  },

  /**
   * Shutdown the pool gracefully.
   */
  async shutdown() {
    if (pool) {
      await pool.end();
      pool = null;
    }
  },
};

export default DatabaseService;
