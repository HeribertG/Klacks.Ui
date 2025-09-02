# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code and build
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist/klacks.ui /usr/share/nginx/html

# Copy nginx configuration if exists, otherwise use default
COPY nginx.conf /etc/nginx/nginx.conf 2>/dev/null || echo "Using default nginx config"

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]