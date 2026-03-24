FROM node:24-slim AS build

WORKDIR /app

ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

COPY admin/package.json admin/package-lock.json ./
RUN npm ci

COPY admin/ ./
RUN npm run build

FROM nginx:alpine
COPY docker/nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
