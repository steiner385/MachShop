# GE Proficy Historian Surrogate Docker Image
# Multi-stage build for optimal production image

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build the TypeScript code
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S historian && \
    adduser -S historian -u 1001 -G historian

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy surrogate-specific files
COPY --chown=historian:historian src/tests/infrastructure/proficy-historian-surrogate/docker/entrypoint.sh ./
COPY --chown=historian:historian src/tests/infrastructure/proficy-historian-surrogate/docker/healthcheck.sh ./

# Make scripts executable
RUN chmod +x entrypoint.sh healthcheck.sh

# Create directories for data and logs
RUN mkdir -p /app/data /app/logs && \
    chown -R historian:historian /app

# Switch to non-root user
USER historian

# Expose default port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD ./healthcheck.sh

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["./entrypoint.sh"]

# Labels for metadata
LABEL maintainer="MachShop Development Team"
LABEL description="GE Proficy Historian Surrogate for Integration Testing"
LABEL version="1.0.0"
LABEL application="proficy-historian-surrogate"