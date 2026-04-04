# Build stage with Angular CLI 21.1.0
# Node 22 (LTS) required for Angular 21 Signals & Zoneless
FROM node:22-alpine AS build
WORKDIR /app

# Install Angular CLI 21.1.0 globally
RUN npm install -g @angular/cli@21.1.0

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build with increased memory
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Build plugin contracts first (required by messaging plugin)
RUN ng build klacks-plugin-contracts

# Build main application (includes all plugins)
RUN ng build --configuration=production

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist/klacks.ui/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]