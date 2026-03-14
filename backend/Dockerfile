# Stage 1: Base image with dependencies
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Stage 2: Development/Test stage
FROM base AS test

# Install all dependencies (including devDependencies for testing)
RUN npm install

# Copy application files
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 3000

# Default command for test stage
CMD ["npm", "test"]

# Stage 3: Production stage
FROM base AS production

# Install only production dependencies
RUN npm install --omit=dev

# Copy application files
COPY . .

# Create uploads directory for images
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
