FROM node:24-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY shared/package.json shared/package-lock.json ./shared/
RUN cd shared && npm ci --omit=dev

COPY shared/ ./shared/

COPY backend-admin/package.json backend-admin/package-lock.json ./backend-admin/
RUN cd backend-admin && npm ci --omit=dev

COPY backend-admin/ ./backend-admin/

RUN mkdir -p /data

WORKDIR /app/backend-admin

EXPOSE 3001
CMD ["node", "src/index.js"]
