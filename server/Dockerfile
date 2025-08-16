# Server Dockerfile - Multi-stage build
# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript code using npm script
RUN npm run build

# Stage 2: Production stage
FROM node:18-alpine AS production

# Install dumb-init and Tesseract OCR
RUN apk add --no-cache dumb-init tesseract-ocr tesseract-ocr-data-eng tesseract-ocr-data-chi_sim

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy compiled code from build stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy production environment configuration file
COPY --chown=nodejs:nodejs .env.production ./.env

# Create temp directory and set permissions
RUN mkdir -p temp && chown nodejs:nodejs temp && chmod 777 temp

# Create image upload directory and set permissions
RUN mkdir -p client/public/images && chown -R nodejs:nodejs client && chmod -R 777 client

# Ensure mount point has correct permissions (set before switching user)
RUN chmod 777 client/public/images

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]