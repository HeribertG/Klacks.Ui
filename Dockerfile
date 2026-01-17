# Build stage
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies - npm ci strictly follows package-lock.json
RUN npm ci

# Verify @angular/forms has signals export (debug)
RUN cat node_modules/@angular/forms/package.json | head -60

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