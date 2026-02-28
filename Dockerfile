# ============================================================================
# Dockerfile — PulseOps V1 (Multi-stage Production Build)
#
# PURPOSE: Builds a production-ready Docker image for deployment to
# GCP Kubernetes Engine (GKE). Uses multi-stage builds to minimize
# final image size (~50MB vs ~1GB with node_modules).
#
# STAGES:
#   1. builder  — Install deps + build React app with Vite
#   2. runtime  — Lightweight Node.js image serving the API + static UI
#
# HOW TO USE:
#   docker build -t pulseops-v1:latest .
#   docker run -p 4000:4000 --env-file .env pulseops-v1:latest
#
# KUBERNETES:
#   - Exposes port 4000 (API + static UI)
#   - Health check: GET /api/health
#   - Liveness probe: GET /api/health/liveness
#   - Readiness probe: GET /api/health/readiness
#   - Graceful shutdown with SIGTERM handling
# ============================================================================

# ── Stage 1: Build the React frontend ────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files for dependency caching
COPY package.json package-lock.json* ./
RUN npm ci --production=false

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Production runtime ──────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Security: run as non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy API source and install production deps only
COPY api/package.json api/package-lock.json* ./api/
RUN cd api && npm ci --production

COPY api/ ./api/

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Environment
ENV NODE_ENV=production
ENV PORT=4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

# Switch to non-root user
USER appuser

EXPOSE 4000

# Start the API server (serves both API routes and static UI)
CMD ["node", "api/src/server.js"]
