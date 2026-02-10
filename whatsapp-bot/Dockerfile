# WhatsApp Bot Docker Configuration
FROM node:20-alpine

# Install Chromium dependencies for puppeteer/whatsapp-web.js
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to skip downloading Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY --chown=nodejs:nodejs . .

# Create auth directory
RUN mkdir -p .wwebjs_auth && chown -R nodejs:nodejs .wwebjs_auth

USER nodejs

# Start the bot
CMD ["node", "src/index.js"]
