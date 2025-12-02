# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use --omit=dev for production builds)
RUN npm ci --omit=dev

# Copy application files
COPY . .

# Create uploads directory for images
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
