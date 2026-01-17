# Build stage
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies using force to strictly follow package-lock.json
# Then explicitly ensure @angular/forms is correct version
RUN npm ci --force && \
    npm ls @angular/forms && \
    cat node_modules/@angular/forms/package.json | grep -A 5 '"version"'

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