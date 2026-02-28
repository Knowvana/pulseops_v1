# PulseOps V1 — Authentication & Security Guide

---

## 1. The Big Picture

PulseOps V1 has a **three-phase security evolution**:

| Phase | State | Auth Source | Where Auth Lives |
|-------|-------|-------------|-----------------|
| **Phase 1 — Now** | ✅ Current | Built-in API middleware | `api/src/core/middleware/auth.js` |
| **Phase 2 — Auth Module Built** | 🔜 Next | Auth module (hot-drop) | `src/modules/auth/` + API middleware |
| **Phase 3 — Production** | 🔮 Future | Auth module + MFA + SSO | Same + OAuth2/SAML providers |

---

## 2. Current State — Phase 1 (What We Have Now)

### 2.1 What EXISTS Today

The API has **enterprise-grade platform-level security** built in:

```
Browser (React UI)
       │  (no auth token attached yet — Auth module not built)
       ▼
Vite Dev Server :3000
       │  proxy /api → :4001
       ▼
Express API :4001
  ├── Helmet.js       → Security headers on every response
  ├── Request ID      → UUID traceability (X-Request-Id header)
  ├── CORS            → Whitelist-based (only :3000 allowed)
  ├── Rate Limiter    → 100 req/15min (general), 10 req/15min (auth)
  ├── Input Sanitizer → XSS pattern stripping
  ├── Public Routes   → /health, /auth/login, /swagger-ui, /modules/bundle
  └── Protected Routes → /modules, /database/wipe, /database/delete-database
           │
           └── authenticate() middleware
                   │  reads Authorization: Bearer <token>
                   │  verifies JWT signature
                   │  attaches req.user = { userId, email, name, role }
                   ▼
              Route Handler
```

### 2.2 What is MISSING Today

The UI has **no login screen**. It calls the API without any JWT token. This is acceptable during development because:
- Database setup routes (`create-database`, `create-schema`, `load-default-data`, `schema-status`, `test-connection`) are **public** — you need them before any user exists
- Module management routes require auth and will return 401 — this is expected until Auth module is built
- The UI uses `ApiClient.suppressSessionExpired(true)` on setup calls to silently ignore 401s during dev

### 2.3 Route Auth Map (Current)

```
Public (no token needed):
  GET  /api/health/*                        → Always public (health probes)
  POST /api/auth/login                      → Get tokens (rate limited: 10/15min)
  GET  /swagger-ui                          → API Explorer
  GET  /api/modules/bundle/:id/manifest.js  → Hot-drop bundle serving
  GET  /api/database/test-connection        → DB config check on page load
  GET  /api/database/schema-status          → DB Objects tab on load
  POST /api/database/create-database        → Bootstrap (no user exists yet)
  POST /api/database/create-schema          → Bootstrap
  POST /api/database/load-default-data      → Bootstrap

Protected (JWT required):
  POST   /api/auth/refresh                  → Refresh access token
  POST   /api/auth/logout                   → Logout
  GET    /api/auth/me                       → Profile
  POST   /api/database/wipe                 → Destructive: drop all tables
  DELETE /api/database/delete-database      → Destructive: drop entire DB
  GET    /api/database/stats                → DB stats
  GET    /api/modules                       → Module management
  POST   /api/modules/:id/install           → Install module
  POST   /api/modules/:id/enable            → Enable module
  POST   /api/modules/:id/disable           → Disable module
  DELETE /api/modules/:id                   → Remove module
  GET/POST /api/config                      → System config
```

---

## 3. API Security — Deep Dive (Layer by Layer)

### Layer 1: Helmet.js — HTTP Security Headers
**File**: `api/src/core/middleware/security.js`

Helmet automatically sets these headers on EVERY response:
```
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
Strict-Transport-Security: max-age=31536000; includeSubDomains  ← Forces HTTPS in prod
X-Content-Type-Options: nosniff          ← Prevents MIME sniffing attacks
X-Frame-Options: DENY                    ← Prevents clickjacking (iframe embeds)
X-XSS-Protection: 0                     ← Modern browsers use CSP instead
```
**What it prevents**: Clickjacking, XSS via MIME sniffing, protocol downgrade attacks.

### Layer 2: Rate Limiting
**File**: `api/src/core/middleware/security.js`

```javascript
generalRateLimiter:  100 requests per 15 minutes per IP
authRateLimiter:      10 requests per 15 minutes per IP (login endpoint)
```
**What it prevents**: Brute-force attacks on login, DDoS on API endpoints.
**Headers added**: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

### Layer 3: Request ID Tracking
**File**: `api/src/core/middleware/security.js`

Every request gets a UUID:
```
Request  → X-Request-Id: a8b3c1d2-e4f5-6789-abcd-ef1234567890
Response → X-Request-Id: a8b3c1d2-e4f5-6789-abcd-ef1234567890 (echoed back)
```
Every log entry includes this ID. This lets you trace a single request through all log lines.
**What it enables**: Distributed tracing, incident investigation, log correlation.

### Layer 4: Input Sanitization
**File**: `api/src/core/middleware/security.js`

Strips dangerous patterns from query strings and URL params:
```
<script>alert('xss')</script>  → stripped
javascript:void(0)             → stripped
onclick=doEvil()               → stripped
```
Note: SQL injection is prevented at the database layer via **parameterized queries** (`$1`, `$2` placeholders) in all database calls.

### Layer 5: JWT Authentication
**File**: `api/src/core/middleware/auth.js`

**Token Structure** (JWT is a 3-part Base64 encoded string):
```
Header.Payload.Signature
eyJhbGci...  .eyJ1c2VySWQi...  .HMACSHA256signature
```
**Payload contains**:
```json
{
  "userId": 1,
  "email": "admin@test.com",
  "name": "Core Admin",
  "role": "super_admin",
  "iat": 1709123456,
  "exp": 1709209856
}
eyJhbGciOiJIUzI1NiJ9  .  eyJ1c2VySWQiOjEsInJvbGUiOiJzdXBlcl9hZG1pbiJ9  .  SIGNATURE
       │                                    │                                      │
  Header (Base64)              Payload (Base64 — NOT encrypted,             HMAC SHA-256
  { alg: "HS256" }            just encoded — never put secrets here!)       signed with
                              {                                             JWT_SECRET
                                userId: 1,
                                email: "admin@test.com",
                                role: "super_admin",
                                iat: 1709123456,    ← issued at
                                exp: 1709209856     ← expires at (24h later)
                              }
```
**Verification flow**:
```
1. Request arrives → middleware reads Authorization header
2. Extracts token from "Bearer <token>"
3. jwt.verify(token, JWT_SECRET) → throws if expired or tampered
4. Decoded payload attached to req.user
5. Route handler accesses req.user.role, req.user.userId

The signature is the security. Anyone can read the payload. But if someone tampers with role: "super_admin" → changed to role: "god", the signature no longer matches the new payload → jwt.verify() throws → 401. The secret key is the only way to produce a valid signature.

How Passwords Are Stored (bcrypt)
```

### Layer 6: Password Hashing (bcrypt)
**File**: `api/src/core/middleware/auth.js`

```
User sets password: "Infosys@123"
                         ↓
bcrypt.hash("Infosys@123", 12 rounds)
                         ↓
Stored: "$2b$12$X7pzQ...hashed_value..."
                         ↓
Login: bcrypt.compare("Infosys@123", storedHash) → true/false
```
**Why 12 rounds?** Each round doubles the computation time. At 12 rounds, hashing takes ~300ms — fast enough for users, slow enough to defeat brute-force attacks (billions of guesses per second becomes impossible).

At login:
  bcrypt.compare("Infosys@123", "$2b$12$X7pzQ...") → true ✅

  bcrypt.compare("wrongpassword", "$2b$12$X7pzQ...") → false ❌
 
Even if DB is leaked: attacker has hashes, not passwords.
Even if two users have same password: hashes are different (random salt baked in).

### Frontend Side (Current — No Login Yet)
``` UI (React)
   │
   └── ApiClient.get('/api/database/schema-status')
           │
           │  No token stored (no login screen yet)
           │  ApiClient sends request WITHOUT Authorization header
           │
           ▼
   API receives request
           │
           ├── Is this a public route? YES (schema-status) → proceeds ✅
           └── Is this a protected route? YES (wipe) → 401 returned
                       │
               UI: suppressSessionExpired(true) → 401 silently ignored
               (setup calls use this to avoid redirect loops)
```
### Layer 7: Role-Based Authorization
**File**: `api/src/core/middleware/auth.js`

```javascript
// Usage in routes:
router.delete('/wipe', authenticate, requireRole('super_admin'), handler)

// Role hierarchy:
super_admin → admin → manager → user → viewer
```

---

## 4. Frontend Security — Current State

### 4.1 ApiClient (`src/shared/services/apiClient.js`)

The frontend's `ApiClient` is the single gateway for all HTTP calls. It:

```
All API calls go through ApiClient
         │
         ├── Reads token from localStorage (tokenKey from constants.json)
         ├── Attaches: Authorization: Bearer <token>   ← When token exists
         ├── Handles 401: dispatches 'auth:session-expired' event
         └── suppressSessionExpired(true/false): suppresses 401 redirect for setup calls
```

**Current limitation**: No token exists yet (no login screen), so all protected API calls return 401. The UI handles this silently for setup calls.

### 4.2 CORS Protection

The API only accepts requests from `http://localhost:3000` (configurable via `CORS_ORIGIN` env var). Any other origin gets:
```
Access-Control-Allow-Origin: http://localhost:3000  ← Only your UI allowed
```
In production, this becomes your actual domain.

### 4.3 Vite Proxy (Dev Only)

```javascript
// vite.config.js
proxy: {
  '/api': 'http://localhost:4001'  ← All /api calls forwarded to Express
}
```
This means the browser never directly contacts `:4001`. Requests go to `:3000/api` → Vite forwards → `:4001/api`.

---

## 5. Phase 2 — After Auth Module is Built

### 5.1 What Changes

When the Auth module is built and hot-dropped, the entire application gains a proper authentication layer:

```
Browser opens PulseOps
        │
        ▼
App.jsx checks: Is user logged in?
        │
   No  ├──────────────────────────────────┐
        │                                   ▼
        │                         Auth Module Login Screen
        │                           (email + password)
        │                                   │
        │                          POST /api/auth/login
        │                                   │
        │                         API validates, returns:
        │                         { accessToken, refreshToken, user }
        │                                   │
        │                     Tokens stored in memory/localStorage
        │                                   │
        │                         App.jsx: setUser(user)
        │                                   │
   Yes ◄──────────────────────────────────┘
        │
        ▼
Platform Dashboard renders
  (all subsequent API calls include: Authorization: Bearer <token>)
```

### 5.2 Full Auth Module Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AUTH MODULE                              │
│                                                             │
│  Frontend Components:                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ LoginScreen  │  │  UserMgmtUI  │  │  SessionManager │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
│                                                             │
│  Frontend Services:                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  AuthContext │  │   useAuth()  │  │  RequireRole    │   │
│  │  (Provider)  │  │   (Hook)     │  │  (Component)    │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
│                                                             │
│  API Routes (new):                                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/users  CRUD  │  /api/roles  │  /api/sessions  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
          │ provides globally to
          ▼
┌─────────────────────────────────────────────────────────────┐
│              ALL OTHER MODULES                               │
│                                                             │
│  Admin Module  │  Logging Module  │  Any Future Module      │
│                                                             │
│  Each uses:                                                 │
│    const { user, role, logout } = useAuth();                │
│    <RequireRole role="admin">...</RequireRole>               │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Global Scope — Auth Applies to Everything

The Auth module provides **platform-wide** auth — NOT per-module auth. This means:

**1. Every API call is authenticated** — no exceptions except health probes and login
```
Before Auth module:  UI → API (no token)   → 401 on protected routes
After Auth module:   UI → API (with token) → 200 on all authorized routes
```

**2. Every UI route is gated**
```javascript
// App.jsx wraps everything in AuthContext
<AuthContext.Provider value={{ user, login, logout, role }}>
  {user ? <PlatformDashboard /> : <LoginScreen />}
</AuthContext.Provider>
```

**3. Every module's navItems filtered by role**
```javascript
// moduleRegistry.js will filter navItems
const visibleNavItems = module.navItems.filter(item =>
  item.requiredRole ? hasRole(user.role, item.requiredRole) : true
);
```

**4. Role-based component rendering**
```jsx
// Any module can use this:
<RequireRole role="super_admin">
  <DangerZoneSettings />
</RequireRole>
```
If the user's role is `admin` (not `super_admin`), `DangerZoneSettings` is not rendered at all.

**5. Modules do NOT implement their own auth**
```
✗ WRONG: Each module has its own login/token logic
✓ RIGHT:  Each module calls useAuth() and gets the platform-wide user/role
```

### 5.4 Token Flow After Auth Module

```
Step 1: User opens app
        → AuthContext checks localStorage for stored token
        → If found + not expired → restore session, no login needed
        → If not found / expired → show LoginScreen

Step 2: User submits login form
        → POST /api/auth/login  { email, password }
        → API validates credentials with bcrypt
        → API generates: accessToken (24h) + refreshToken (7d)
        → API returns: { accessToken, refreshToken, user: { id, email, name, role } }
        → AuthContext stores tokens + user in state + localStorage

Step 3: User navigates the app
        → Every ApiClient call: Authorization: Bearer <accessToken>
        → API middleware verifies token signature + expiry
        → API attaches req.user to the request
        → Route handler runs with known user identity

Step 4: Access token expires (after 24h)
        → ApiClient gets 401 response
        → ApiClient auto-calls POST /api/auth/refresh { refreshToken }
        → API issues new accessToken
        → ApiClient retries the original request with new token
        → Seamless — user never sees a login screen

Step 5: Refresh token expires (after 7 days) or user logs out
        → AuthContext clears tokens from localStorage
        → App shows LoginScreen
        → User logs in again

Step 6: User logs out
        → POST /api/auth/logout (tells API to optionally blacklist token)
        → localStorage.removeItem(tokenKey)
        → AuthContext resets to null
        → App shows LoginScreen
```

### 5.5 User Management (Auth Module UI)

The Auth module will provide a full user management interface under `Admin → Users`:
- Create/edit/delete users
- Assign roles (super_admin, admin, manager, user, viewer)
- Suspend/reactivate accounts
- View login history
- Force logout (invalidate all tokens)
- Password reset (admin-initiated)

---

## 6. Phase 3 — Production Hardening (Future)

After the Auth module is built, these enhancements make it fully production-grade:

| Enhancement | Why | Implementation |
|-------------|-----|----------------|
| **HttpOnly Cookies** | Eliminates XSS token theft risk | Set-Cookie instead of localStorage |
| **Token Blacklisting** | Force logout, compromised token revocation | Redis store of revoked JTIs |
| **MFA (2FA)** | Adds second factor after password | TOTP (Google Authenticator) |
| **SSO / OAuth2** | Enterprise Identity Provider integration | Passport.js + OAuth2/SAML |
| **Audit Logging** | Compliance (SOC2, ISO27001) | system_logs table + log viewer |
| **Session Timeout** | Idle session security | Frontend idle timer + forced logout |
| **IP Allowlisting** | Restrict admin access by IP | Middleware IP check |
| **Certificate Pinning** | Prevent MITM attacks | HTTPS + cert validation |

---

## 7. Security Architect Verdict

> **Rating: 7.5/10 — Solid Enterprise Foundation, Not Yet Production-Grade**

### What is Production-Grade ✅

| Feature | Status | Detail |
|---------|--------|--------|
| JWT + Refresh tokens | ✅ Done | 24h access, 7d refresh, separate secrets |
| bcrypt password hashing | ✅ Done | 12 rounds — strong enough |
| Helmet.js security headers | ✅ Done | CSP, HSTS, XSS, clickjacking prevention |
| Rate limiting | ✅ Done | Per-IP, configurable windows |
| CORS hardening | ✅ Done | Whitelist-only origins |
| Parameterized SQL queries | ✅ Done | Full SQL injection prevention |
| Input sanitization | ✅ Done | XSS pattern stripping |
| Request ID tracing | ✅ Done | UUID per request in all logs |
| Role-based authorization | ✅ Done | `requireRole()` middleware |
| Error masking | ✅ Done | Stack traces never sent to client |
| Graceful shutdown | ✅ Done | Connection pool drain on SIGTERM |
| Body size limit | ✅ Done | 10MB max prevents payload attacks |

### What is Missing for Full Production ⚠️

| Gap | Risk Level | Fix |
|-----|-----------|-----|
| **No login UI yet** | 🔴 High (dev only) | Build Auth module |
| **localStorage token storage** | 🟡 Medium | Move to HttpOnly cookies in Phase 3 |
| **No token blacklisting** | 🟡 Medium | Redis store of revoked tokens |
| **No audit log** | 🟡 Medium | Log all auth events to DB |
| **No account lockout** | 🟡 Medium | Lock after N failed attempts |
| **No MFA** | 🟠 Medium-High | TOTP for admin accounts |
| **HTTP in dev** | 🟡 Dev only | HTTPS in production via reverse proxy |
| **JWT secret in .env** | 🟡 Dev only | Use secrets manager (Vault/AWS SM) in prod |

### Summary

The **API layer is enterprise-grade**. Every professional security control that belongs in an API (headers, rate limiting, hashing, JWT, input sanitization, role checks, error masking) is implemented correctly. The **gap is purely in the frontend** — no login screen and no token storage yet. This is architectural, not a bug — the Auth module is the next planned piece to close this gap.

Once the Auth module is built and HttpOnly cookies replace localStorage, this system reaches **9/10** production readiness. The remaining 1 point requires MFA and a proper secrets management integration for a true zero-trust enterprise posture.

---

## 8. Files Reference

### API Security Files
| File | Responsibility |
|------|---------------|
| `api/src/core/middleware/security.js` | Helmet, rate limiters, request ID, input sanitization |
| `api/src/core/middleware/auth.js` | JWT generation/verification, bcrypt, authenticate(), requireRole() |
| `api/src/core/routes/authRoutes.js` | POST /login, /refresh, /logout, GET /me |
| `api/src/config/app.json` | JWT secrets (dev), token expiry, bcrypt rounds |
| `api/.env` | JWT secrets (override), DB password — never commit to git |
| `api/src/config/messages.json` | All auth error/success messages |

### Frontend Security Files
| File | Responsibility |
|------|---------------|
| `src/shared/services/apiClient.js` | Bearer token injection, 401 handling, session-expired events |
| `src/shared/config/urls.json` | All API endpoint URLs |
| `vite.config.js` | Dev proxy /api → :4001 |

### Future Auth Module Files (not yet built)
| File | Responsibility |
|------|---------------|
| `src/modules/auth/manifest.jsx` | Module manifest, navItems, views |
| `src/modules/auth/context/AuthContext.jsx` | Global auth state provider |
| `src/modules/auth/hooks/useAuth.js` | Hook for all modules to access user/role |
| `src/modules/auth/components/LoginScreen.jsx` | Login UI |
| `src/modules/auth/components/UserManagement.jsx` | User CRUD UI |
| `src/modules/auth/components/RequireRole.jsx` | Role-based render guard |
