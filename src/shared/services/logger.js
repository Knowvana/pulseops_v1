// ============================================================================
// Logger Service — PulseOps V1
//
// PURPOSE: Centralized, structured logging for the entire platform.
// All log messages are read from logMessages.json — NO inline messages.
// Maintains separate system and API log buffers with subscriber pattern
// for real-time UI updates (RightPanel, LogsViewer).
//
// ARCHITECTURE: Singleton service imported via '@shared'. Supports log
// levels (debug, info, warn, error). Stores logs in circular buffers.
// Subscribers are notified on every new entry. Logs are auto-flushed
// to the database when the buffer reaches the sync threshold.
//
// FEATURES:
//   - Structured log entries with source, event, user context
//   - Separate system and API log buffers
//   - Subscriber pattern for real-time UI updates
//   - Auto-flush to database via ApiClient
//   - Configurable log level, buffer size, sync threshold
//   - Config persisted in localStorage (survives pod restarts)
//
// USAGE:
//   import { Logger } from '@shared';
//   Logger.info('ModuleName', 'Action description', { userId });
//   Logger.error('ModuleName', 'Error occurred', { error: err.message });
//
// DEPENDENCIES:
//   - @shared/config/logMessages.json → Default config values
//   - @shared/config/constants.json   → Logger config key, log levels
//   - @shared/services/apiClient.js   → For flushing logs to DB
// ============================================================================
import logMessages from '@shared/config/logMessages.json';
import constants from '@shared/config/constants.json';
import ApiClient from '@shared/services/apiClient';

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const LOG_LEVEL_NAMES = constants.logging.levels;
const CONFIG_KEY = constants.coreAuth.loggerConfigKey;

let _idCounter = 0;
function nextId() { return `log_${Date.now()}_${++_idCounter}`; }

class LoggerService {
  constructor() {
    // Circular buffers for system and API logs
    this._systemLogs = [];
    this._apiLogs = [];
    // Subscriber set for real-time UI updates
    this._subscribers = new Set();

    // Load config from localStorage or use defaults from constants.json
    const savedConfig = localStorage.getItem(CONFIG_KEY);
    this._config = savedConfig ? JSON.parse(savedConfig) : {
      minLevel: constants.logging.defaultLevel,
      maxBufferSize: constants.logging.maxBufferSize,
      consoleOutput: true,
      captureApiCalls: true,
      captureTimestamps: true,
      syncLimit: constants.logging.defaultSyncLimit,
      flushIntervalMs: constants.logging.flushIntervalMs,
    };

    // Current user context for log entries
    this._user = null;
    // Prevents concurrent flush operations
    this._isSyncing = false;
    // Re-entrancy guard — prevents infinite recursion if subscriber logs
    this._isNotifying = false;
  }

  // ── Config management ─────────────────────────────────────────────────────
  getConfig() { return { ...this._config }; }

  updateConfig(cfg) {
    this._config = { ...this._config, ...cfg };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(this._config));
  }

  getSyncLimit() { return this._config.syncLimit; }
  setSyncLimit(limit) {
    this._config.syncLimit = limit;
    localStorage.setItem(CONFIG_KEY, JSON.stringify(this._config));
  }

  getLogLevels() { return LOG_LEVEL_NAMES; }
  setUser(user) { this._user = user; }
  getUser() { return this._user; }

  // ── Log retrieval ─────────────────────────────────────────────────────────
  getSystemLogs() { return [...this._systemLogs]; }
  getApiLogs() { return [...this._apiLogs]; }

  // ── Subscriber pattern (for RightPanel, LogsViewer real-time updates) ─────
  subscribe(fn) {
    this._subscribers.add(fn);
    return () => this._subscribers.delete(fn);
  }

  _notify() {
    this._subscribers.forEach((fn) => { try { fn(); } catch (_) { /* swallow */ } });
  }

  // ── Database sync (auto-flush when buffer reaches threshold) ──────────────
  async _syncToDatabase() {
    if (this._isSyncing) return;

    const unsyncedSystem = this._systemLogs.filter(l => !l.synced);
    const unsyncedApi = this._apiLogs.filter(l => !l.synced);

    if (unsyncedSystem.length === 0 && unsyncedApi.length === 0) return;

    this._isSyncing = true;
    try {
      // Suppress session-expired events during log sync — backend may not be
      // running. Without this, 401 from log sync triggers session-expired →
      // more log entries → more syncs → infinite cascade.
      ApiClient.suppressSessionExpired(true);

      if (unsyncedSystem.length > 0) {
        const res = await ApiClient.post('/logs/system', unsyncedSystem);
        if (res?.success) {
          unsyncedSystem.forEach(l => { l.synced = true; });
        }
      }

      if (unsyncedApi.length > 0) {
        const res = await ApiClient.post('/logs/api', unsyncedApi);
        if (res?.success) {
          unsyncedApi.forEach(l => { l.synced = true; });
        }
      }

      ApiClient.suppressSessionExpired(false);
      // NOTE: Do NOT call _notify() here — it re-triggers subscribers which
      // may log again, causing recursive cascade. Subscribers are already
      // notified by _addSystemEntry after each individual log.
    } catch (err) {
      ApiClient.suppressSessionExpired(false);
      console.warn(logMessages.logging.flushFailed, err);
    } finally {
      this._isSyncing = false;
    }
  }

  // ── Level check ───────────────────────────────────────────────────────────
  _shouldLog(level) {
    return LOG_LEVELS[level] >= LOG_LEVELS[this._config.minLevel || 'info'];
  }

  // ── Core system log entry creator ─────────────────────────────────────────
  _addSystemEntry(level, source, message, data = null, options = {}) {
    if (!this._shouldLog(level)) return;

    const entry = {
      id: nextId(),
      timestamp: new Date().toISOString(),
      level,
      source: options.source || 'UI',
      event: options.event || source,
      message,
      data,
      user: this._user?.email || this._user?.name || 'system',
      userId: this._user?.id || null,
      result: level === 'error' ? 'failure' : level === 'warn' ? 'warning' : 'success',
      synced: false,
    };

    this._systemLogs.unshift(entry);
    if (this._systemLogs.length > this._config.maxBufferSize) {
      this._systemLogs.pop();
    }

    // Mirror to browser console if enabled
    if (this._config.consoleOutput) {
      const consoleFn = level === 'error' ? console.error
        : level === 'warn' ? console.warn
        : level === 'debug' ? console.debug
        : console.log;
      consoleFn(`[${level.toUpperCase()}] [${source}] ${message}`, data || '');
    }

    // Guard against re-entrant _notify — if a subscriber calls Logger.info()
    // inside its callback, _isNotifying prevents infinite recursion.
    if (!this._isNotifying) {
      this._isNotifying = true;
      this._notify();
      this._isNotifying = false;
    }
    this._checkFlushThreshold();
  }

  // ── Check if buffer should auto-flush to DB ──────────────────────────────
  _checkFlushThreshold() {
    const unsyncedCount = this._systemLogs.filter(l => !l.synced).length
      + this._apiLogs.filter(l => !l.synced).length;
    if (unsyncedCount >= this._config.syncLimit) {
      this._syncToDatabase();
    }
  }

  // ── Public log methods ────────────────────────────────────────────────────
  debug = (source, message, data) => { this._addSystemEntry('debug', source, message, data); }
  info = (source, message, data) => { this._addSystemEntry('info', source, message, data); }
  warn = (source, message, data) => { this._addSystemEntry('warn', source, message, data); }
  error = (source, message, data) => { this._addSystemEntry('error', source, message, data); }

  // ── API call logger (separate buffer, called by ApiClient) ────────────────
  logApiCall = ({ method, url, path, statusCode, durationMs, success, requestPayload, responsePayload, user }) => {
    if (!this._config.captureApiCalls) return;

    const entry = {
      id: nextId(),
      timestamp: new Date().toISOString(),
      method: method || 'GET',
      url: url || path || '',
      path: path || url || '',
      statusCode: statusCode || 0,
      durationMs: durationMs || 0,
      success: success !== false,
      requestPayload: requestPayload || null,
      responsePayload: responsePayload || null,
      user: user || this._user?.email || 'system',
      synced: false,
    };

    this._apiLogs.unshift(entry);
    if (this._apiLogs.length > this._config.maxBufferSize) {
      this._apiLogs.pop();
    }

    this._notify();
    this._checkFlushThreshold();
  }

  // ── Buffer management ─────────────────────────────────────────────────────
  clearSystemLogs() { this._systemLogs = []; this._notify(); }
  clearApiLogs() { this._apiLogs = []; this._notify(); }
  clearAll() { this._systemLogs = []; this._apiLogs = []; this._notify(); }

  // ── Manual flush ──────────────────────────────────────────────────────────
  async flush() { return this._syncToDatabase(); }
}

// ── Singleton export ──────────────────────────────────────────────────────────
const Logger = new LoggerService();

// Wire up Logger ↔ ApiClient to avoid circular dependency
ApiClient.setLogger(Logger);

export default Logger;
