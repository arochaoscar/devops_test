# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2: Build application
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

# Security: remove unnecessary packages and upgrade existing ones
RUN apk update && apk upgrade --no-cache \
    && apk add --no-cache dumb-init \
    && rm -rf /var/cache/apk/*

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy only what's needed from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma schema for migrations and full node_modules for prisma CLI + client
# Prisma v6 with pnpm requires .pnpm, @prisma/client, @prisma/engines, and prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Security: read-only filesystem support — writable tmp for Next.js cache
RUN mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app/.next/cache

# Security: drop all capabilities, run as non-root
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Security: dumb-init handles PID 1 and signal forwarding properly
ENTRYPOINT ["dumb-init", "--"]
# Run Prisma migrations then start the server
# Invoke prisma directly via node (no pnpm/npx in prod image)
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
