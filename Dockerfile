FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy project files
COPY . .

# Expose port
EXPOSE 8080

# Run the server
CMD ["node", "server.js"]
