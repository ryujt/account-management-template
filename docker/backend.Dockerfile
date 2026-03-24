FROM node:24-slim

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install root dependencies (express, cookie-parser, zod)
COPY package.json package-lock.json ./
RUN npm ci

# Install shared dependencies
COPY shared/package.json shared/package-lock.json ./shared/
RUN cd shared && npm ci --omit=dev

# Copy source
COPY shared/ ./shared/
COPY scripts/ ./scripts/

EXPOSE 3000 3001

CMD ["node", "scripts/local-server.js"]
