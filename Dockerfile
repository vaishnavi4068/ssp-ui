FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . ./
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine

USER root
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker-entrypoint.d/40-inject-runtime-config.sh /docker-entrypoint.d/40-inject-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-inject-runtime-config.sh && \
    chown -R 101:101 /usr/share/nginx/html /docker-entrypoint.d/40-inject-runtime-config.sh

USER 101

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
