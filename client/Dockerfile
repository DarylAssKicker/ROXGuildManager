# Client Dockerfile - Multi-stage build
# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (including dev dependencies, needed for build)
RUN npm ci

# Accept build arguments
ARG VITE_API_BASE_URL=/api

# Copy source code
COPY . .

# Copy environment variable files (if they exist)
COPY .env* ./

# Create environment variable file for build
RUN echo "VITE_API_BASE_URL=${VITE_API_BASE_URL}" > .env.production

# Build application
RUN npm run build

# Stage 2: Production stage
FROM nginx:alpine

# Copy build artifacts to nginx directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy public directory to nginx html directory
COPY --from=builder /app/public/ /usr/share/nginx/html/

# Copy nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]