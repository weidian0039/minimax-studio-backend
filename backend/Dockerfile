# ─────────────────────────────────────────────────────────────────────────────
# MiniMax Studio Backend — Production Dockerfile
# Multi-stage: TypeScript compilation in builder, slim production image
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS builder

WORKDIR /app

# Install all dependencies (including dev for build)
COPY package*.json ./
RUN npm ci --frozen-lockfile

# Copy TypeScript source and db schema
COPY tsconfig.json ./
COPY src ./src
COPY db ./db

# Compile TypeScript → dist/
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Production Stage
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

WORKDIR /app

# Copy installed node_modules from builder
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Copy compiled JavaScript output (dist/) and db schema
COPY --from=builder --chown=nodeuser:nodejs /app/dist ./dist
COPY --from=builder --chown=nodeuser:nodejs /app/db ./db
COPY --chown=nodeuser:nodejs package.json ./package.json
COPY --chown=nodeuser:nodejs package-lock.json ./package-lock.json

USER nodeuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
