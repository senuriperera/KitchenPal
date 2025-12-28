# Stage 1: Base image with dependencies
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Stage 2: Development stage
FROM base AS development

# Install all dependencies
RUN npm ci

# Copy application files (will be overridden by volume in dev)
COPY . .

# Expose port
EXPOSE 4200

# Default command
CMD ["npm", "start", "--", "--host", "0.0.0.0", "--disable-host-check"]
