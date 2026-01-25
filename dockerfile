FROM node:20

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json package-lock.json* ./

# Configure npm for better reliability
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5 && \
    npm install --verbose

# Copy all source code
COPY . .

# Copy migrations folder
COPY migrations /app/migrations

# Copy and set permissions for entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Install PostgreSQL client for migrations
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

# Build TypeScript (jika ada)
RUN if [ -f tsconfig.json ]; then npm run build; fi

# Expose port sesuai aplikasi (misal 5000)
EXPOSE 5000

# Use entrypoint script to run migrations before starting app
ENTRYPOINT ["/app/docker-entrypoint.sh"]

