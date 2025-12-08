FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/elasticsearch-worker ./elasticsearch-worker/

# Runtime stage
FROM alpine:3.18
WORKDIR /app

COPY --from=builder /app/bin/elasticsearch-worker .

ENV MAXMIND_CITY_DB=/app/db/GeoLite2-City.mmdb
ENV MAXMIND_ASN_DB=/app/db/GeoLite2-ASN.mmdb

ENTRYPOINT ["./elasticsearch-worker"]
