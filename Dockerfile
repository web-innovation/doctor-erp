# ==========================================
# BUILD STAGE - CLIENT
# ==========================================
FROM node:20-alpine AS client-builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ==========================================
# BUILD STAGE - SERVER
# ==========================================
FROM node:20-alpine AS server-builder

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ ./
RUN npx prisma generate

# ==========================================
# PRODUCTION STAGE
# ==========================================
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built assets
COPY --from=server-builder --chown=nodejs:nodejs /app/server ./server
COPY --from=client-builder --chown=nodejs:nodejs /app/client/dist ./client/dist

# Create necessary directories
RUN mkdir -p /app/server/uploads /app/server/logs && \
    chown -R nodejs:nodejs /app

USER nodejs

WORKDIR /app/server

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
