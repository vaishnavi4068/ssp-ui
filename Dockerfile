FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . ./
RUN npm run build

FROM golang:1.26-alpine AS gobuild
WORKDIR /src
COPY go.mod ./
COPY cmd/portal ./cmd/portal
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /portal ./cmd/portal

FROM alpine:3.20

RUN adduser -D -u 101 -g 101 portal && \
    apk add --no-cache ca-certificates

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker-entrypoint.d/40-inject-runtime-config.sh /docker-entrypoint.d/40-inject-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-inject-runtime-config.sh && \
    chown -R portal:portal /usr/share/nginx/html

COPY --from=gobuild /portal /usr/local/bin/portal

USER 101
ENV PORTAL_ROOT=/usr/share/nginx/html \
    PORTAL_LISTEN=:8080

EXPOSE 8080
ENTRYPOINT ["/docker-entrypoint.d/40-inject-runtime-config.sh"]
CMD ["/usr/local/bin/portal"]
