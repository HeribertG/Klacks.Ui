# Build stage
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies - all Angular packages now use v21
RUN npm ci --legacy-peer-deps

# Copy source code and build with increased memory
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist/klacks.ui/browser /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]