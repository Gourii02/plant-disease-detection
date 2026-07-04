# --- Stage 1: Build Go core binary ---
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy dependency definition
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o core-service cmd/main.go

# --- Stage 2: Final minimal runtime ---
FROM alpine:3.18

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/

# Copy binary and configuration files
COPY --from=builder /app/core-service .
COPY --from=builder /app/config.yaml .

EXPOSE 8080

ENTRYPOINT ["./core-service"]
