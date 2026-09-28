# ============================================================
#  Happy inside expérience — Dockerfile (اختياري / optionnel)
#  Used only if you deploy with Docker (Railway Docker builder,
#  VPS, Vercel ignores it). Requires package-lock.json → npm ci.
# ============================================================
FROM node:20-alpine

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies first (better Docker layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Build the app
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# `next start` respects the PORT env var injected by Railway / hosts
CMD ["npm", "run", "start"]
