# PulseOps V1 — Architecture Redesign (v1.1)

## Summary of Changes

This document captures the architectural decisions made to address security, modularity, and zero-downtime requirements.

---

## 1. HttpOnly Cookies (XSS Protection)

**Before:** JWT tokens stored in `localStorage`, attached via `Authorization: Bearer` header.
**After:** JWT tokens stored in **HttpOnly cookies** set by the backend. Frontend uses `credentials: 'include'` on every request.

### Why?
- `localStorage` is accessible to any JavaScript running on the page — if an XSS vulnerability exists, tokens can be stolen.
- **HttpOnly cookies** are invisible to JavaScript — the browser sends them automatically but scripts cannot read them.

### What changed?
- `ApiClient` — removed `getToken()`, `setToken()`, `clearTokens()`, `getRefreshToken()`, `setRefreshToken()`. Added `credentials: 'include'` to every `fetch()` call.
- `constants.json` — removed `tokenKey` and `refreshTokenKey` from auth config.
- Backend (when built) will set `Set-Cookie: token=...; HttpOnly; Secure; SameSite=Strict`.

---

## 2. Core Admin Login (Works Without Backend)

**Before:** Login required a running backend API and database.
**After:** Built-in `CoreAuthService` provides admin login that works offline.

### How it works:
1. Default admin credentials defined in `constants.json` → `coreAuth.defaultAdmin`
2. Default: `admin@pulseops.local` / `PulseOps@2024`
3. Admin can update credentials via Core Settings (stored in `localStorage`)
4. `CoreAuthService.login()` tries backend first → falls back to local credentials
5. Session stored in `localStorage` with 24-hour expiry

### Login Flow:
```
User enters email/password
  → CoreAuthService.login()
    → Try backend API (POST /api/auth/login) via HttpOnly cookie
      → If success → return backend user
      → If network error → fall through
    → Try local core admin credentials
      → If match → store session in localStorage, return user
      → If no match → throw error
```

### Files:
- `src/shared/services/coreAuthService.js` — New service
- `src/shared/config/constants.json` → `coreAuth` section replaces `auth` section
- `src/core/App.jsx` → Uses `CoreAuthService` instead of `AuthService`

---

## 3. Auth Module is Now Optional (Add-On)

**Before:** Auth was a core module — always bundled, always visible.
**After:** Auth is an **add-on module** — installed via Module Manager.

### Why?
- Core system should be minimal — just admin dashboard + logging
- Auth module provides full user management (CRUD, RBAC, sessions, audit)
- But the platform needs to work before Auth is installed
- `CoreAuthService` handles bootstrap authentication

### What changed?
- `moduleRegistry.js` — Auth removed from `STATIC_MANIFESTS`, added to `MODULE_IMPORT_MAP`
- `auth/manifest.jsx` — `isCore: false`
- `auth/constants.json` — `isCore: false`
- `constants.json` → `coreModuleIds: ["platform_admin", "logging"]`

---

## 4. Core System = Admin + Logging Only

**Before:** Core modules: `platform_admin`, `auth`, `logging`, `api_manager`
**After:** Core modules: `platform_admin`, `logging` only

### Core modules (always bundled, cannot be removed):
| Module | Purpose |
|--------|---------|
| `platform_admin` | System dashboard, module manager, settings |
| `logging` | System logs, API logs, log configuration |

### Add-on modules (installed via Module Manager):
| Module | Purpose |
|--------|---------|
| `auth` | Full user management, RBAC, sessions |
| `api_manager` | API gateway, endpoint management, health |
| `demo` | Reference implementation, pattern validation |

---

## 5. Zero-Downtime Module Addition

**Before:** All modules statically imported — adding a module required a code change and rebuild.
**After:** Add-on modules loaded via `dynamic import()` at runtime.

### How it works:
1. `moduleRegistry.js` has a `MODULE_IMPORT_MAP` — maps module IDs to `import()` functions
2. When `PlatformDashboard` mounts, it fetches enabled modules from DB
3. For each enabled module, it calls `loadModuleManifest(id)` which triggers `import()`
4. The manifest is cached in `_dynamicManifests` — no duplicate imports
5. New modules can be registered at runtime via `registerModulePath(id, importFn)`

### Adding a new module (zero downtime):
1. Place module folder under `src/modules/<name>/` with `manifest.jsx`
2. Register its import path in `MODULE_IMPORT_MAP` (or via `registerModulePath()`)
3. Register it in the database via Module Manager UI
4. Platform discovers and loads it — **no rebuild, no restart, no downtime**

### Files:
- `moduleRegistry.js` — `loadModuleManifest()`, `loadModuleManifests()`, `registerModulePath()`
- `PlatformDashboard.jsx` — Calls `loadModuleManifests()` after fetching DB modules

---

## 6. Updated File Map

### Config Changes:
- `constants.json` — `auth` → `coreAuth`, `coreModuleIds` reduced to 2
- `logMessages.json` — Added `coreAuth` section
- `errorMessages.json` — Added `coreAuth` section
- `uiText.json` — Added `coreAdminHint` to login section

### New Files:
- `src/shared/services/coreAuthService.js` — Built-in admin auth

### Modified Files:
- `src/shared/services/apiClient.js` — HttpOnly cookies, removed token storage
- `src/shared/services/logger.js` — Updated config key reference
- `src/shared/index.js` — Added `CoreAuthService` export
- `src/core/App.jsx` — Uses `CoreAuthService`
- `src/core/PlatformDashboard.jsx` — Dynamic module loading
- `src/modules/moduleRegistry.js` — Dynamic import map, only 2 core modules
- `src/modules/auth/manifest.jsx` — `isCore: false`
- `src/modules/auth/constants.json` — `isCore: false`
- `src/modules/api_manager/manifest.jsx` — `isCore: false`
- `src/modules/api_manager/constants.json` — `isCore: false`
- `src/shared/components/LoginForm.jsx` — Shows default credentials hint
