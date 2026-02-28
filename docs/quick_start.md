# PulseOps V1 — Quick Start Guide

---

## 1. Infrastructure Services (Docker)

### Start PostgreSQL + pgAdmin
```bash
podman compose -f docker-compose-pgsql.yml up -d
# or
docker-compose -f docker-compose-pgsql.yml up -d
```

### Stop Infrastructure
```bash
podman compose -f docker-compose-pgsql.yml down
# or
docker-compose -f docker-compose-pgsql.yml down
```

---

## 2. URLs

| Service            | URL                              | Notes                        |
|--------------------|----------------------------------|------------------------------|
| **Frontend UI**    | http://localhost:3000             | Vite dev server              |
| **Backend API**    | http://localhost:4001/api        | Express API                  |
| **API Explorer**   | http://localhost:4001/swagger-ui | Swagger UI (interactive)     |
| **API JSON Spec**  | http://localhost:4001/api-docs/swagger.json | OpenAPI 3.0 spec   |
| **pgAdmin**        | http://localhost:5050            | Database management UI       |
| **PostgreSQL**     | localhost:5432                   | Direct DB connection         |
| **Health Check**   | http://localhost:4001/api/health | API health probe             |
| **K8s Liveness**   | http://localhost:4001/api/health/liveness  | Kubernetes probe    |
| **K8s Readiness**  | http://localhost:4001/api/health/readiness | Kubernetes probe    |

---

## 3. Credentials

### PostgreSQL (from docker-compose)
| Key            | Value              |
|----------------|--------------------|
| **Host**       | localhost          |
| **Port**       | 5432               |
| **User**       | postgres           |
| **Password**   | Infosys@123        |
| **Database**   | pulseops_v1        |
| **Schema**     | pulseops           |

### pgAdmin (from docker-compose)
| Key            | Value              |
|----------------|--------------------|
| **URL**        | http://localhost:5050 |
| **Email**      | admin@domain.com   |
| **Password**   | Infosys@123        |

> **pgAdmin → Add Server**: Host = `postgres` (Docker service name), Port = `5432`, Username = `postgres`, Password = `Infosys@123`

### Default Admin User (seeded by API)
| Key            | Value              |
|----------------|--------------------|
| **Email**      | admin@test.com     |
| **Password**   | Infosys@123        |
| **Name**       | Core Admin         |
| **Role**       | super_admin        |

### API Authentication (JWT)
| Key                    | Value                          |
|------------------------|--------------------------------|
| **Login endpoint**     | POST /api/auth/login           |
| **Token header**       | Authorization: Bearer <token>  |
| **Token expiry**       | 24 hours (configurable)        |
| **Refresh token**      | 7 days (configurable)          |
| **Public routes**      | /health/*, /auth/login, /api-docs/* |

---

## 4. Startup Commands

### Step 1: Start Infrastructure
```bash
cd "c:\My Development\Knowvana\pulseops_v1"
podman compose -f docker-compose-pgsql.yml up -d
```

### Step 2: Install Dependencies (first time only)
```bash
cd "c:\My Development\Knowvana\pulseops_v1"
npm install
cd api
npm install
cd ..
```

### Step 3: Start Both UI + API
```bash
npm run dev
```
Or start separately:
```bash
npm run dev:ui     # Frontend on :3000
npm run dev:api    # API on :4001
```

### Step 4: Initialize Database (first time only)
```bash
# Create database
curl -X POST http://localhost:4001/api/database/create-database

# Create schema + tables
curl -X POST http://localhost:4001/api/database/create-schema

# Seed default admin user + core module
curl -X POST http://localhost:4001/api/database/load-default-data
```
Or use the UI: **Admin → Settings → Database Objects** tab.

### Step 5: Build Hot-Drop Modules (optional)
```bash
npm run build:module demo       # Single module
npm run build:module logging    # Another module
npm run build:modules           # All non-core modules
```

---

## 5. API Endpoints Summary

### Public (no auth required)
| Method | Endpoint                          | Description                    |
|--------|-----------------------------------|--------------------------------|
| GET    | /api/health                       | Health check                   |
| GET    | /api/health/liveness              | K8s liveness probe             |
| GET    | /api/health/readiness             | K8s readiness probe            |
| POST   | /api/auth/login                   | Login, returns JWT tokens      |
| GET    | /api-docs                         | Swagger API Explorer           |

### Protected (JWT required)
| Method | Endpoint                          | Description                    |
|--------|-----------------------------------|--------------------------------|
| POST   | /api/auth/refresh                 | Refresh access token           |
| POST   | /api/auth/logout                  | Invalidate session             |
| GET    | /api/auth/me                      | Current user profile           |
| POST   | /api/database/create-database     | Create the database            |
| GET    | /api/database/test-connection     | Test DB connection             |
| GET    | /api/database/schema-status       | Schema init state              |
| POST   | /api/database/create-schema       | Create schema + tables         |
| POST   | /api/database/load-default-data   | Seed default data              |
| DELETE | /api/database/load-default-data   | Clean default data             |
| POST   | /api/database/wipe                | Drop all tables (destructive!) |
| GET    | /api/database/stats               | Table sizes and counts         |
| GET    | /api/modules                      | List installed modules         |
| GET    | /api/modules/available            | Discover hot-drop modules      |
| GET    | /api/modules/:id                  | Get module by ID               |
| POST   | /api/modules/:id/install          | Install a module               |
| POST   | /api/modules/:id/enable           | Enable a module                |
| POST   | /api/modules/:id/disable          | Disable a module               |
| DELETE | /api/modules/:id                  | Remove a module                |
| GET    | /api/modules/bundle/:id/manifest.js | Serve hot-drop manifest      |
| GET    | /api/config                       | List all config entries        |
| GET    | /api/config/:key                  | Get config by key              |
| POST   | /api/config                       | Upsert config entry            |

---

## 6. Security Features (Enterprise-Grade)

| Feature                  | Implementation                                   |
|--------------------------|--------------------------------------------------|
| **JWT Authentication**   | Access token (24h) + Refresh token (7d)          |
| **Password Hashing**     | bcrypt with configurable salt rounds             |
| **Helmet.js**            | HTTP security headers (CSP, HSTS, XSS, etc.)    |
| **Rate Limiting**        | Per-IP: 100 req/15min (general), 5 req/15min (login) |
| **CORS Hardening**       | Whitelist-based origins, credentials support     |
| **Input Sanitization**   | SQL injection prevention (parameterized queries) |
| **Request ID Tracking**  | UUID per request for traceability                |
| **Graceful Shutdown**    | SIGTERM/SIGINT handlers, connection pool drain   |
| **Error Masking**        | Internal errors never leak stack traces to client|
| **Body Size Limit**      | 10MB max JSON payload                            |

---

## 7. Auth Module — Future Plan

> **The Auth module is NOT built yet.** It will be implemented as a hot-drop add-on module.

### What Will the Auth Module Do?

The Auth module will provide **global authentication and authorization** for the **entire application and all modules**, not just the admin panel. It will be the single security gateway for every API call and every UI route.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                   AUTH MODULE                        │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Login/Logout│  │  RBAC Engine │  │ User Mgmt │  │
│  │   Screens   │  │  (Policies)  │  │   CRUD    │  │
│  └─────────────┘  └──────────────┘  └───────────┘  │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │   Session   │  │  Permission  │  │  Audit    │  │
│  │  Management │  │   Registry   │  │   Trail   │  │
│  └─────────────┘  └──────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────┘
         │                    │                │
         ▼                    ▼                ▼
  ┌──────────┐  ┌──────────────────┐  ┌────────────┐
  │  Admin   │  │  Logging Module  │  │  Any New   │
  │  Module  │  │                  │  │   Module   │
  └──────────┘  └──────────────────┘  └────────────┘
```

### Global Responsibilities

1. **Authentication (Who are you?)**
   - Login screen with email/password
   - JWT token issuance and validation
   - Session management (active sessions, force logout)
   - Password reset / change password flows
   - Multi-factor authentication (MFA) — future phase
   - SSO / OAuth2 integration points — future phase

2. **Authorization (What can you do?)**
   - **Role-Based Access Control (RBAC)**: super_admin > admin > manager > user > viewer
   - **Module-level permissions**: Each module declares its required roles in `constants.json`
   - **Route-level permissions**: API endpoints protected by role checks
   - **UI-level permissions**: Navigation items, buttons, and views hidden/shown based on role
   - **Data-level permissions**: Row-level security for multi-tenant scenarios

3. **Global Scope — Applies to ALL Modules**
   - Every API call passes through the auth middleware (except public routes)
   - Every frontend route checks authentication state before rendering
   - Every module's `navItems` are filtered by the user's role
   - Every module can declare custom permissions that the Auth module enforces
   - Modules do NOT implement their own auth — they delegate to the Auth module

4. **User Management**
   - CRUD operations for system users
   - Role assignment and management
   - User status (active/suspended/locked)
   - Login history and audit trail

5. **Frontend Integration**
   - Auth context provider wrapping the entire app
   - `useAuth()` hook available to all modules
   - Protected route wrapper component
   - Login/logout/session-expired screens
   - Role-based component rendering (`<RequireRole role="admin">`)

### How It Will Work with Hot-Drop

The Auth module will be built and hot-dropped like any other module:
```bash
npm run build:module auth
# → dist-modules/auth/manifest.js
# → API discovers it, UI loads it
```

However, unlike other add-on modules, the Auth module's **middleware runs at the API level** (not just the UI level). When installed:
- The API loads the auth middleware from the module's backend component
- All subsequent requests are authenticated/authorized
- The UI shows the login screen and manages session state

### Current State (Before Auth Module)

Right now, the API has a **built-in JWT auth middleware** (`api/src/core/middleware/auth.js`) that provides basic authentication:
- Login endpoint (`POST /api/auth/login`)
- JWT token validation on protected routes
- Role extraction from token claims

This is the **platform-level security baseline**. The Auth module will extend this with the full user management UI, RBAC policies, and advanced features listed above.

---

## 8. Troubleshooting

| Problem | Solution |
|---------|----------|
| API won't start | Check PostgreSQL is running: `podman ps` |
| DB connection failed | Verify credentials in `api/.env` match docker-compose |
| pgAdmin can't connect | Use host `postgres` (not localhost) inside Docker network |
| Module not showing | Run `npm run build:module <name>` first |
| CORS error in browser | Ensure API is running on :4001 and UI on :3000 |
| JWT token expired | Login again via `POST /api/auth/login` |
| Rate limited | Wait 15 minutes or restart API server |
