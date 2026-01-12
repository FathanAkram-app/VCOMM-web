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

# Build TypeScript (jika ada)
RUN if [ -f tsconfig.json ]; then npm run build; fi

# Expose port sesuai aplikasi (misal 5000)
EXPOSE 5000

# Jalankan aplikasi (ubah sesuai entrypoint project)
CMD ["npm", "start"]
