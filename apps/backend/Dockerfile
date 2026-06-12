# Build context is the repo root (see docker-compose.yml) so we can pull in the
# shared tsconfig.base.json that apps/backend/tsconfig.json extends.

# --- Build stage ---
FROM node:22-alpine AS build
WORKDIR /app
COPY tsconfig.base.json ./
COPY apps/backend/package.json ./apps/backend/
WORKDIR /app/apps/backend
RUN npm install
COPY apps/backend/tsconfig.json ./
COPY apps/backend/src ./src
RUN npm run build

# --- Runtime stage ---
FROM node:22-alpine AS runtime
WORKDIR /app/apps/backend
ENV NODE_ENV=production
COPY apps/backend/package.json ./
RUN npm install --omit=dev
COPY --from=build /app/apps/backend/dist ./dist
EXPOSE 4000
CMD ["node", "dist/server.js"]
