FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/enrich-meta-worker ./enrich-meta-worker/

# Runtime stage
FROM alpine:3.18
WORKDIR /app

COPY --from=builder /app/bin/enrich-meta-worker .

COPY db-data/GeoLite2-City.mmdb /app/db/GeoLite2-City.mmdb
COPY db-data/GeoLite2-ASN.mmdb /app/db/GeoLite2-ASN.mmdb

ENV MAXMIND_CITY_DB=/app/db/GeoLite2-City.mmdb
ENV MAXMIND_ASN_DB=/app/db/GeoLite2-ASN.mmdb

ENTRYPOINT ["./enrich-meta-worker"]
