FROM node:20

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source code
COPY . .

# Build TypeScript (jika ada)
RUN if [ -f tsconfig.json ]; then npm run build; fi

# Expose port sesuai aplikasi (misal 5000)
EXPOSE 5000

# Jalankan aplikasi (ubah sesuai entrypoint project)
CMD ["npm", "start"]
