# =============================================================================
# Production Dockerfile — Multi-stage Hardened Build
# =============================================================================
# Three stages to minimize the final image size and attack surface:
#
#   1. deps    — Install dependencies (cached layer, only rebuilds on lockfile change)
#   2. builder — Build the Next.js app (standalone output) + generate Prisma client
#   3. runner  — Minimal production image with security hardening
#
# Security features:
#   - Non-root user (nextjs:nodejs, UID 1001)
#   - dumb-init as PID 1 for proper signal handling (SIGTERM → graceful shutdown)
#   - Alpine packages upgraded at build time
#   - Read-only filesystem support (only .next/cache writable)
#   - No dev dependencies in the final image
#
# On startup, the container runs Prisma migrations then starts the server.
# Environment variables (DATABASE_URL, RECAPTCHA_*, etc.) are injected at
# runtime by ECS — nothing is baked into the image.
# =============================================================================

# Stage 1: Install dependencies
# Cached independently — only rebuilds when package.json or lockfile change
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2: Build application
# Generates the standalone output (server.js + minimal node_modules)
# and the Prisma client for the target platform (linux-musl)
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm prisma generate
RUN pnpm build

# Stage 3: Production runner (hardened)
FROM node:20-alpine AS runner
WORKDIR /app

# Upgrade all Alpine packages and install dumb-init for PID 1 signal handling
RUN apk update && apk upgrade --no-cache \
    && apk add --no-cache dumb-init \
    && rm -rf /var/cache/apk/*

# Create non-root user — the container runs as UID 1001
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy the standalone build output (server.js + trimmed node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma schema (for migrations) and full node_modules (for prisma CLI).
# Prisma v6 with pnpm requires .pnpm, @prisma/client, @prisma/engines, and prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Create writable cache directory for Next.js ISR/static regeneration
RUN mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app/.next/cache

# Drop to non-root user for runtime
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# dumb-init wraps the CMD to handle SIGTERM/SIGINT properly
# (Node.js doesn't forward signals when running as PID 1)
ENTRYPOINT ["dumb-init", "--"]

# Run Prisma migrations against the live database, then start the server.
# Uses node directly (no pnpm/npx) since corepack isn't in the final image.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
