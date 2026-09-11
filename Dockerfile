# Build stage — Angular 22 / Node 22 LTS.
# Pinned to $BUILDPLATFORM: the Angular bundle is platform-independent, so npm ci and ng build run
# natively on the CI host instead of under QEMU. The emulated arm64 npm ci hung for six hours on the
# v1.0.26 release build (2026-09-06); only the nginx stage below needs to be multi-arch.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies from the lockfile only, so the image is reproducible.
# --legacy-peer-deps is passed explicitly (ngx-codemirror@20 has no v22 release yet)
# because .npmrc is not copied into the build context.
RUN npm ci --legacy-peer-deps

# Build identity. Release builds pass the tag version and the commit SHA (deploy.yml); a build
# without these arguments is a development build and never checks for a newer deployed version.
# Declared after npm ci so a new version does not invalidate the dependency layer.
ARG KLACKS_VERSION=0.0.0
ARG KLACKS_BUILD_KEY=dev

# Copy source code
COPY . .

# Build with increased memory
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Build plugin contracts first (required by messaging plugin)
RUN npx ng build klacks-plugin-contracts

# Stamp the build identity into the bundle (src/build-info.ts) ...
RUN npx tsx tools/write-build-info.ts source

# Build main application (includes all plugins)
RUN npx ng build --configuration=production

# ... and publish the same identity next to index.html (version.json) for open tabs.
RUN npx tsx tools/write-build-info.ts dist

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist/klacks.ui/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
