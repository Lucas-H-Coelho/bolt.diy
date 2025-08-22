# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S bolt -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=bolt:nodejs /app/dist ./dist
COPY --from=builder --chown=bolt:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=bolt:nodejs /app/package*.json ./

USER bolt

EXPOSE 8000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
