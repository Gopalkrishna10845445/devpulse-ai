# -------------------------------------------------------------------
# DevPilot Production Multi-Stage Dockerfile
# Node.js 20 Alpine Minimal Base Image
# Non-Root Security Hardened
# -------------------------------------------------------------------

# Stage 1: Dependency Installation Stage
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit

# Stage 2: Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure public directory exists for static asset resolution and multi-stage copy
RUN mkdir -p /app/public

ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Perform production compilation
RUN npm run build

# Stage 3: Minimal Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3005
ENV HOSTNAME "0.0.0.0"

# Create non-root system user & group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy runtime assets and built bundles
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Expose healthcheck probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3005/api/health/live || exit 1

# Drop privileges to non-root user
USER nextjs

EXPOSE 3005

CMD ["npm", "start"]
