# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

# Install dependencies first so this layer is cached unless package*.json changes.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Application source. .dockerignore keeps node_modules, .env, tests, uploads, and
# other dev-only files out of the build context / image.
COPY . .

# fileuploader.js creates uploads/cvs itself at import time if missing, but pre-creating
# it here (and chowning the whole app dir) means the non-root user below can actually
# write to it - a directory created by root at runtime wouldn't be writable otherwise.
RUN mkdir -p uploads/cvs && chown -R node:node /app

# The official Node image ships a non-root "node" user - use it instead of root.
USER node

ENV NODE_ENV=production
EXPOSE 4000

# Secrets (JWT_SECRET, JWT_REFRESH_SECRET, MONGO_URL, ...) are supplied at
# `docker run`/orchestrator level via environment variables - never baked into the image.
CMD ["node", "server.js"]
