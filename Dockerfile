# Image for Hugging Face Spaces (Docker SDK, free CPU plan).
FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Download the embeddings model at build time so the server does not fetch
# ~130 MB every time the Space wakes up, then drop dev dependencies.
RUN npm run build \
  && npm run download-model \
  && npm prune --omit=dev \
  && chown -R node:node /app

# Spaces run containers as user 1000, which is `node` in this image.
USER node

ENV NODE_ENV=production
ENV PORT=7860
EXPOSE 7860

CMD ["node", "dist/main.js"]
