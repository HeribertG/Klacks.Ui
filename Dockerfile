# Build stage — Angular 22 / Node 22 LTS
FROM node:22-alpine AS build
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (legacy-peer-deps for ngx-codemirror@20 which has no v22 yet)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build with increased memory
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Build plugin contracts first (required by messaging plugin)
RUN npx ng build klacks-plugin-contracts

# Build main application (includes all plugins)
RUN npx ng build --configuration=production

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist/klacks.ui/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]