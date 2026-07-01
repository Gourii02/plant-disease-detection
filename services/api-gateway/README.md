# API Gateway & Routing Configuration

This directory contains gateway settings, proxy configurations, and rate-limiting scripts.

## Responsibilities
- Serve as the single public entrypoint for all clients (Web and Mobile).
- Validate client JWT tokens at the edge prior to forwarding requests to internal services.
- Prevent denial-of-service attempts by enforcing rate limits per client IP or API key.
- Route requests dynamically (e.g., `/api/v1/users` to the Go core-service, `/api/v1/diagnose` to the AI FastAPI worker service).
- Manage CORS headers and enforce TLS protocols.

## Recommended Stack
- **Kong API Gateway** or **Nginx Proxy** (configured with rate-limiting plugins).
