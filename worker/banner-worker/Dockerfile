# Build stage
FROM golang:1.24-alpine AS builder
RUN apk add --no-cache git
WORKDIR /app

# Copy root module files for dependency resolution
COPY go.mod go.sum ./
RUN go mod download

# Copy service source code
COPY banner-worker ./banner-worker

# Build the binary and place it in a different path than the source folder
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/banner-worker ./banner-worker

# Runtime stage
FROM alpine:3.18
WORKDIR /app
RUN apk add --no-cache ca-certificates

# Copy only the binary into the runtime image
COPY --from=builder /app/bin/banner-worker /app/banner-worker

# Ensure executable permissions
RUN chmod +x /app/banner-worker

EXPOSE 8080
ENTRYPOINT ["/app/banner-worker"]
