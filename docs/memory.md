# PulseOps V1 — Development Memory

> **Auto-updated by Cascade after each work session.**
> Last updated: 2026-03-01

---

## 1. Project Overview

PulseOps V1 is an enterprise modular operations platform with a plug-and-play module architecture. The platform consists of:

- **Frontend (UI)**: React + Vite + TailwindCSS at `src/`
- **Backend (API)**: Express + pg (node-postgres) + Winston at `api/`
- **Hot-Drop Modules**: Built independently → dropped into `dist-modules/` → discovered at runtime

### Key URLs
- UI Dev Server: `http://localhost:3000`
- API Server: `http://localhost:4001`
- API Prefix: `/api`
- All URLs defined in: `src/shared/config/urls.json`

---

## 2. Architecture

### Module Types
| Type | Example | Bundled? | Loaded How | Can Remove? |
|------|---------|----------|------------|-------------|
| **Core** | Admin (`platform_admin`), Auth (`auth`) | Yes, statically imported | `import` at build time | No |
| **Add-on** | Logging, API Manager, Demo | No | Dynamic `import()` from URL at runtime | Yes |

### Core vs Add-on Rules
- `src/shared/config/constants.json` → `coreModuleIds: ["platform_admin", "auth"]`
- Admin and Auth are core. Everything else is add-on.
- Core modules are in `STATIC_MANIFESTS` in `moduleRegistry.js`
- Add-on modules are loaded via `MODULE_IMPORT_MAP` or from hot-drop URLs

### Module Manifest Contract
Every module must export a manifest with:
- **REQUIRED**: `id`, `name`, `version`, `description`, `icon`, `defaultView`, `navItems`, `getViews`
- **OPTIONAL**: `roles`, `order`, `isCore`, `getConfigTabs`, `getSettingsTabs`, `ViewWrapper`, `dependencies`

### Module Metadata Source
All module metadata comes from `constants.json` (single source of truth):
- `moduleId`, `moduleName`, `moduleShortName`, `moduleVersion`, `moduleDescription`
- `roles`, `isCore`, `order`, `defaultView`
- Manifests import from `@modules/<id>/constants.json` — NO hardcoded duplicates

---

## 3. Hot-Drop Module Architecture

### How It Works (Full Flow)
```
Developer builds module:
  npm run build:module demo
    ↓
Vite library-mode build (vite.module.config.js):
  src/modules/demo/manifest.jsx → dist-modules/demo/manifest.js (ES module)
  + copies constants.json, uiText.json
    ↓
API serves built modules as static files:
  GET /api/modules/bundle/<moduleId>/manifest.js → serves dist-modules/<id>/manifest.js
    ↓
API scanner discovers modules:
  GET /api/modules/available → reads dist-modules/ folder, returns metadata from constants.json
    ↓
Module Manager UI shows "Available" modules:
  User clicks Install → POST /api/modules/<id>/install → registers in DB
  User clicks Enable → POST /api/modules/<id>/enable → sets enabled=true
    ↓
Frontend dynamically imports manifest from API URL:
  import(/* @vite-ignore */ '/api/modules/bundle/<id>/manifest.js')
    ↓
Module appears in navigation and views — NO restart, NO rebuild
```

### Loading Order in moduleRegistry.loadModuleManifest()
1. Check if already cached in `_dynamicManifests`
2. Check if it's a core module in `STATIC_MANIFESTS`
3. Try `MODULE_IMPORT_MAP[moduleId]` (runtime-registered hot-drop paths)
4. Try hot-drop URL: `import('/api/modules/bundle/<id>/manifest.js')` ← **true hot-drop**
5. Dev fallback: `DEV_FALLBACK_MAP[moduleId]` → `import('@modules/<id>/manifest.jsx')`

### Why Modules Show in "Available" Without Backend
When no API is running, `ModuleService.getAvailable()` catches the failed API call and
falls back to `scanBundledModules()` which uses `DEV_BUNDLED_CONSTANTS` — these import
`constants.json` from the **Vite dev server source tree** (`@modules/<id>/constants.json`).
This is a **development convenience only**, NOT true hot-dropping.

### Key Files
| File | Purpose |
|------|---------|
| `vite.module.config.js` | Vite library-mode config for building individual modules |
| `scripts/build-module.js` | CLI to build one or all non-core modules |
| `api/src/core/modules/moduleScanner.js` | Scans `dist-modules/` for available modules |
| `api/src/core/routes/moduleRoutes.js` | REST endpoints for module CRUD (protected) |
| `api/src/core/routes/moduleBundleRoutes.js` | Serve hot-drop manifest.js + assets (public) |
| `api/src/core/routes/authRoutes.js` | Login, refresh, logout, /me |
| `api/src/core/middleware/auth.js` | JWT generation, verification, bcrypt, authenticate, requireRole |
| `api/src/core/middleware/security.js` | Helmet, rate limiting, request ID, input sanitization |
| `api/src/config/swagger.json` | OpenAPI 3.0 spec for Swagger UI |
| `src/modules/moduleRegistry.js` | Frontend registry: static + dynamic manifest management |
| `src/shared/services/moduleService.js` | Frontend service for module API calls + offline fallback |

### Build Commands
```bash
npm run build:module demo      # Build single module
npm run build:modules           # Build all non-core modules
```

### Output Structure
```
dist-modules/
  demo/
    ├── manifest.js        (ES module bundle — externalized React/Lucide)
    ├── constants.json     (metadata for scanner API)
    └── uiText.json        (UI text, if exists)
```

---

## 4. Backend API (`api/`)

### Stack
- Express 4, pg (node-postgres), Winston logging, dotenv config
- **Security**: Helmet.js, express-rate-limit, JWT (jsonwebtoken), bcryptjs
- **API Explorer**: Swagger UI at http://localhost:4001/api-docs
- Port: 4001 (configurable via PORT env var)
- Database: PostgreSQL with custom schema `pulseops` (not public)

### Config Loading
- `api/src/config/app.json` — default values
- `api/.env` — environment overrides
- `api/src/config/index.js` — merges env + JSON defaults
- `api/src/shared/loadJson.js` — `fs.readFileSync` helper (NOT `import assert`)
- `api/src/config/messages.json` — all log/error/success messages

### Routes — Public (no auth)
| Route | Purpose |
|-------|--------|
| `GET /api/health` | Health check |
| `GET /api/health/readiness` | K8s readiness (checks DB) |
| `POST /api/auth/login` | Login → JWT tokens (provider-routed) |
| `GET /api/auth/config` | Get current auth provider config |
| `GET /swagger-ui` | Swagger API Explorer |
| `GET /api-docs/swagger.json` | OpenAPI JSON spec |
| `GET /api/modules/bundle/:id/manifest.js` | **Serve built manifest (hot-drop)** |
| `GET /api/modules/bundle/:id/:file` | Serve module assets |
| `POST /api/database/create-database` | Bootstrap: create DB (no user yet) |
| `GET /api/database/test-connection` | DB config check on page load |
| `GET /api/database/schema-status` | DB Objects tab status check |
| `POST /api/database/create-schema` | Bootstrap: create schema + tables |
| `POST /api/database/load-default-data` | Bootstrap: seed admin + core module |
| `DELETE /api/database/load-default-data` | Clean default data |

### Routes — Protected (JWT required)
| Route | Purpose |
|-------|--------|
| `POST /api/auth/refresh` | Refresh access token |
| `POST /api/auth/logout` | Logout |
| `GET /api/auth/me` | Current user profile |
| `POST /api/auth/config` | Save auth provider (super_admin only) |
| `DELETE /api/database/delete-database` | **Drop entire database** |
| `POST /api/database/wipe` | Drop all tables (keep DB) |
| `GET /api/database/stats` | Table sizes and counts |
| `GET /api/modules` | List installed modules from DB |
| `GET /api/modules/available` | Scan hot-drop folder |
| `POST /api/modules/:id/install` | Install module to DB |
| `POST /api/modules/:id/enable` | Enable module |
| `POST /api/modules/:id/disable` | Disable module |
| `DELETE /api/modules/:id` | Remove module |
| `GET /api/config` | List system config |
| `POST /api/config` | Save config key/value |

### Security (Middleware Chain in app.js)
1. Helmet.js — HTTP security headers (CSP, HSTS, XSS, clickjacking)
2. Request ID — UUID per request for traceability
3. CORS — Whitelist-based origins with credentials
4. Rate Limiting — 100 req/15min (general), 10 req/15min (auth)
5. JSON body parser — 10MB limit
6. Input sanitization — XSS pattern stripping
7. Request logging — includes request ID
8. JWT authentication — Bearer token on all protected routes

### Database Tables (schema: `pulseops`)
- `system_users` — id, email, password_hash, name, role, status, last_login
- `system_config` — id, key, value (JSONB), description
- `system_modules` — id, module_id, name, version, description, is_core, enabled, schema_initialized, order
- `system_logs` — id, level, source, message, data (JSONB), user_id

### Default Data
- Admin user: `admin@test.com` / `Infosys@123` / role: `super_admin`
- Core module: `platform_admin` registered with enabled=true

---

## 5. Frontend UI

### Shared Components (from `@shared`)
`Button`, `Card`, `PageHeader`, `Modal`, `StatusTile`, `ConfirmDialog`, `EmptyState`, `LoadingSpinner`, `LoginForm`, `SettingsConfig`

### Layout Components
`TopNav`, `SideNav`, `RightPanel`, `AppShell`

### Services
`Logger`, `ApiClient`, `CoreAuthService`, `ModuleService`

> **Note:** `AuthService` is deprecated — `CoreAuthService` is the single unified auth service.

### Admin Module Settings Tabs
- **Database Configuration**: Connection form, test connection, save config, SSL toggle, status tile
- **Database Objects**: Schema status, initialize DB, load/clean default data, wipe all (danger zone)
- **General**: Placeholder for future platform-wide settings

### UI Text / Messages Pattern
- `src/modules/<id>/uiText.json` — all UI labels (NO hardcoded strings)
- `src/modules/<id>/logMessages.json` — all log messages
- `src/modules/<id>/errorMessages.json` — all error messages
- `src/shared/config/uiText.json` — shared platform UI text

---

## 6. Completed Tasks

| # | Task | Status |
|---|------|--------|
| T1 | Fix constants duplication — all manifests read from constants.json | DONE |
| T2 | Make Logging add-on (isCore: false), only Admin is core | DONE |
| T3 | Hot-drop build config (vite.module.config.js + build script) | DONE |
| T4 | Module Manager UI offline fallback (scanBundledModules) | DONE |
| T5 | Database Config UI (connection form, test, save, status) | DONE |
| T6 | Database Objects UI (schema init, data load, wipe) | DONE |
| T7 | New backend API from scratch (Express + pg) | DONE |
| T8 | Demo module ready for hot-drop test | DONE |
| T9 | docs/memory.md created for future reference | DONE |
| T10 | Backend serves manifest.js: GET /api/modules/bundle/:id/manifest.js | DONE |
| T11 | moduleRegistry uses URL-based import() + DEV_FALLBACK_MAP | DONE |
| T12 | Build script outputs directly to dist-modules/ (no extra copy step) | DONE |
| T13 | End-to-end hot-drop wired: build → API serves → UI imports from URL | DONE |
| T14 | Swagger API Explorer at /api-docs (swagger-ui-express + OpenAPI 3.0 spec) | DONE |
| T15 | Enterprise security: Helmet, rate limiting, request ID, input sanitization | DONE |
| T16 | JWT auth: login, refresh, logout, /me + bcrypt password hashing | DONE |
| T17 | Split moduleBundleRoutes.js (public) from moduleRoutes.js (protected) | DONE |
| T18 | POST /api/database/create-database route (app creates its own DB) | DONE |
| T19 | docs/quick_start.md with URLs, credentials, commands, Auth module plan | DONE |
| T20 | DELETE /database/delete-database + dropDatabase() in databaseService.js | DONE |
| T21 | Create Database + Delete Database UI in DatabaseObjectsTab | DONE |
| T22 | Fix auth gate: setup routes public, only wipe/delete/stats protected | DONE |
| T23 | docs/authentication.md — full security/auth doc + architect verdict (7.5/10) | DONE |
| T24 | Fix pg.Pool unhandled error event — add pool.on('error') in databaseService.js | DONE |
| T25 | Fix Vite proxy crash when API is down — add configure error handler in vite.config.js | DONE |
| T26 | Fix core admin 401 loop — suppress session-expired events when user.isCoreAdmin is true | DONE |
| T27 | Comprehensive database setup UI improvements — pink warnings, dynamic button states, clear messaging | DONE |
| T28 | Fix test-connection 500 error — backend returns 200 with error code, frontend shows pink gradient warning | DONE |
| T29 | Login form prepopulates default admin email/password and shows password by default | DONE |
| T30 | Auth Module refactored as CORE: JSON file auth by default, DB auth switchable via UI | DONE |

---

## 6b. Auth Module Architecture (T30)

### Auth Provider System
The Auth Module governs all authentication for both UI and API. The active provider is stored in `api/src/config/auth-provider.json` (always readable, no DB required) and mirrored to `system_config` table when DB is available.

| Provider | Storage | Requires DB? | Switch From UI? |
|----------|---------|-------------|----------------|
| `json_file` | `api/src/config/users.json` | No | N/A (default) |
| `database` | `pulseops.system_users` table | Yes (initialized) | Yes |
| `social` | OAuth2 config | Yes | Coming soon |

### Auth Flow
1. **Login**: `CoreAuthService.login()` calls `POST /api/auth/login` → API reads provider → validates against `users.json` or DB
2. **Token**: API returns `{ accessToken, refreshToken, user }` → stored in localStorage + set on `ApiClient` as Bearer
3. **Session restore**: On reload, `CoreAuthService.getCurrentUser()` reads localStorage → restores token to ApiClient (no API call)
4. **401 handling**: `ApiClient` dispatches `auth:session-expired` → `App.jsx` clears session + token
5. **Logout**: `CoreAuthService.logout()` → clears localStorage + `ApiClient.clearToken()` + `POST /api/auth/logout`

### Auth Provider Config API
- `GET /api/auth/config` — public, returns `{ provider, availableProviders }`
- `POST /api/auth/config` — protected (super_admin JWT), validates DB readiness if switching to `database`

### Key New/Changed Files (T30)
| File | Change |
|------|--------|
| `api/src/config/users.json` | NEW — default users for json_file auth |
| `api/src/config/auth-provider.json` | NEW — stores active provider |
| `api/src/core/routes/authRoutes.js` | Refactored — provider-based login + config endpoints |
| `src/modules/auth/constants.json` | `isCore: true` |
| `src/modules/moduleRegistry.js` | Auth in STATIC_MANIFESTS |
| `src/shared/services/apiClient.js` | Bearer token support (`setToken`/`clearToken`) |
| `src/shared/services/coreAuthService.js` | Rewritten — API-only, token-based |
| `src/modules/auth/components/AuthConfig.jsx` | AuthProviderTab fully functional |

---

## 7. Important Patterns

### No Hardcoded Strings
- UI labels → `uiText.json`
- Log messages → `logMessages.json`
- Error messages → `errorMessages.json`
- API URLs → `urls.json`
- DB config → `app.json` + `.env`

### No Redundant Code
- All modules share `Card`, `Button`, `StatusTile` etc. from `@shared`
- `DatabaseService.query()` is the single DB access point (no per-route pool creation)
- `MODULE_IMPORT_MAP` replaced with dynamic URL-based loading for hot-dropped modules

### Import Paths
- Always use `@shared`, `@modules`, `@core` aliases — NO relative paths
- Backend uses `fs.readFileSync` for JSON — NO `import assert` (Node compat)

---

## 8. How to Run

```bash
# Install deps
npm install                    # Frontend
cd api && npm install          # API

# Development (both UI + API)
npm run dev

# Or separately
npm run dev:ui                 # Frontend on :3000
npm run dev:api                # API on :4001

# Build modules for hot-drop
npm run build:module demo      # Single module
npm run build:modules          # All non-core

# Production build
npm run build                  # Frontend → dist/
```

---

## 9. Step-by-Step Hot-Drop Test Guide

### Prerequisites
- PostgreSQL running locally on port 5432
- User: `postgres`, Password: `Infosys@123`
- Node.js 18+ installed

### STEP 1: Install Dependencies
Open a terminal in `pulseops_v1/` and run:
```bash
npm install
cd api
npm install
cd ..
```

### STEP 2: Start the API Server
```bash
cd api
npm run dev
```
You should see: `PulseOps V1 API started on port 4001`

**Verify it's running** — open a NEW terminal:
```bash
curl http://localhost:4001/api/health
```
Expected: `{"success":true,"data":{"status":"ok","timestamp":"..."}}`

### STEP 3: Create the Database
The API needs a `pulseops_v1` database. Call:
```bash
curl -X POST http://localhost:4001/api/database/create-database
```
Expected: `{"success":true,"data":{"created":true,"database":"pulseops_v1"}}`
(If DB already exists: `{"success":true,"data":{"created":false,...,"message":"Database already exists."}}`)

### STEP 4: Create Schema + Seed Data
```bash
curl -X POST http://localhost:4001/api/database/create-schema
curl -X POST http://localhost:4001/api/database/load-default-data
```
This creates `pulseops` schema with tables (`system_users`, `system_config`, `system_modules`, `system_logs`) and seeds the admin user + core module.

**Verify:**
```bash
curl http://localhost:4001/api/database/schema-status
```
Expected: `{"success":true,"data":{"connected":true,"initialized":true,"hasDefaultData":true,"tables":[...]}}`

### STEP 5: Verify NO Modules in Hot-Drop Folder
```bash
curl http://localhost:4001/api/modules/available
```
Expected: `{"success":true,"data":[]}` — **empty array** because `dist-modules/` doesn't exist yet.

This proves the scanner only finds modules that are actually built and placed in `dist-modules/`.

### STEP 6: Build the Demo Module
Back in the `pulseops_v1/` root:
```bash
npm run build:module demo
```
This runs `vite build` with `vite.module.config.js` and outputs to:
```
dist-modules/demo/
  ├── manifest.js        (ES module bundle)
  ├── constants.json     (copied for scanner)
  └── uiText.json        (copied if exists)
```

### STEP 7: Verify Scanner Discovers the Demo Module
```bash
curl http://localhost:4001/api/modules/available
```
Expected: A non-empty array with the demo module:
```json
{"success":true,"data":[{"moduleId":"demo","name":"Demo Module","version":"1.0.0",...,"hasManifest":true,"source":"hot-drop"}]}
```

### STEP 8: Verify API Serves the Built Manifest
```bash
curl http://localhost:4001/api/modules/bundle/demo/manifest.js
```
Expected: JavaScript code (the ES module bundle). This is the file the frontend will `import()` at runtime.

### STEP 9: Start the Frontend UI
Open a new terminal in `pulseops_v1/`:
```bash
npm run dev:ui
```
Open browser: `http://localhost:3000`

### STEP 10: Test Module Manager UI
1. Navigate to **Admin → Module Manager**
2. Click the **"Available"** tab
3. You should see the **Demo module** listed with `source: hot-drop`
4. Click **Install** → module gets registered in the database
5. Click **Enable** → module becomes active

### STEP 11: Verify Hot-Drop Loading
After enabling:
- The frontend calls `loadModuleManifest('demo')`
- This tries `import('/api/modules/bundle/demo/manifest.js')` ← **TRUE hot-drop from API**
- The Vite proxy forwards `/api` to `http://localhost:4001`
- The API serves `dist-modules/demo/manifest.js`
- The module appears in navigation

Open browser DevTools → Network tab → look for a request to `/api/modules/bundle/demo/manifest.js` — this confirms the manifest loaded from the API, not from the Vite source tree.

### STEP 12: Build Another Module to Prove Zero-Downtime Drop
Without stopping anything, build another module:
```bash
npm run build:module logging
```
Now go back to Module Manager → Available tab → click Refresh → **Logging module** appears.
Install + Enable it — loads from API URL. **No restart. No rebuild. No downtime.**

---

## 10. Known Issues / Notes

- Windows CMD terminal tool doesn't show Node.js stdout (exit codes are reliable)
- `import assert { type: 'json' }` not used in API — replaced with `fs.readFileSync` via `loadJson.js`
- Existing `pulseops-api` (port 4000) is UNTOUCHED — new API is at port 4001
- Vite proxy forwards `/api` to `http://localhost:4001` in dev mode
