# infi-Eureka ships as ONE Cloud Run service: Fastify answers the API under
# /api/v1 and serves the built React app on every other path. Same origin, so
# there is no CORS to configure, no VITE_API_URL to point anywhere, and no
# second host to deploy — the relative /api/v1 the frontend already uses just
# works, exactly as it does behind the Vite dev proxy.

# ---------- 1. Build the React app ----------
FROM node:24-slim AS frontend
WORKDIR /app

# Vite substitutes VITE_* values into the bundle at build time, so they arrive
# as build args rather than runtime env vars — setting them on the Cloud Run
# service later would have no effect. VITE_API_URL is deliberately absent: its
# default of "/api/v1" is a relative path, which is what makes same-origin
# serving work.
ARG VITE_RAZORPAY_KEY_ID=""
ARG VITE_GA4_MEASUREMENT_ID=""
ARG VITE_FIGURE_BASE_URL="https://storage.googleapis.com/infi-eureka-assets"
ENV VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID \
    VITE_GA4_MEASUREMENT_ID=$VITE_GA4_MEASUREMENT_ID \
    VITE_FIGURE_BASE_URL=$VITE_FIGURE_BASE_URL

# package files first: this layer is cached until a dependency actually changes,
# so day-to-day code edits skip the slow npm install.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- 2. Compile the backend ----------
FROM node:24-slim AS backend
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# ---------- 3. Runtime ----------
# A third stage so the shipped image carries neither TypeScript, nor the build
# tools, nor any devDependency — only what `node dist/server.js` actually needs.
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=backend /app/dist ./dist
# src/app.ts looks for the frontend at ../public relative to the compiled file.
COPY --from=frontend /app/dist ./public

# Cloud Run picks the port and passes it as $PORT; config/env.ts already reads
# it, defaulting to 3000 locally. EXPOSE is documentation — Cloud Run ignores it.
EXPOSE 8080
CMD ["node", "dist/server.js"]
