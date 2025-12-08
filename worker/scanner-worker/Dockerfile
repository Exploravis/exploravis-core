# Builder stage
FROM golang:1.24-alpine AS builder

WORKDIR /app
RUN apk add --no-cache git libpcap-dev build-base

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=1 GOOS=linux go build -o /app/bin/scanner-worker ./scanner-worker

# Runtime stage
FROM alpine:3.18
WORKDIR /app
RUN apk add --no-cache ca-certificates libpcap
COPY --from=builder /app/bin/scanner-worker .
ENTRYPOINT ["./scanner-worker"]
