# Build stage — Angular 22 / Node 22 LTS.
# Pinned to $BUILDPLATFORM: the Angular bundle is platform-independent, so npm ci and ng build run
# natively on the CI host instead of under QEMU. The emulated arm64 npm ci hung for six hours on the
# v1.0.26 release build (2026-09-06); only the nginx stage below needs to be multi-arch.
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies from the lockfile only, so the image is reproducible.
# --legacy-peer-deps is passed explicitly (ngx-codemirror@20 has no v22 release yet)
# because .npmrc is not copied into the build context.
RUN npm ci --legacy-peer-deps

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