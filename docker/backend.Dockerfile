FROM node:24-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY shared/package.json shared/package-lock.json ./shared/
RUN cd shared && npm ci --omit=dev

COPY shared/ ./shared/

COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

COPY backend/ ./backend/

RUN mkdir -p /data

WORKDIR /app/backend

EXPOSE 3000
CMD ["node", "src/index.js"]
