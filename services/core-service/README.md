# Core Business Service (Go)

This service manages user accounts, authentication tokens, diagnostic history indexing, and the agronomic treatment database.

## Responsibilities
- User account creation, profile management, and secure authentication (Argon2id + JWT).
- Manage diagnostic log records, linking diagnosis requests to database users and geolocations.
- Expose agronomic recommendation lookups (organic and chemical treatments, crop information, prevention practices).
- Coordinate multi-upload asynchronous batch diagnostic jobs via Redis queues.

## Architecture Guidelines
Follow clean Domain-Driven Design (DDD) principles:
- **Domain**: Contains basic entity schemas (User, Diagnosis, Treatment) and core logic interfaces. No external dependencies.
- **Usecase**: Orchestrates business rules, calling repository interfaces to write or fetch database details.
- **Adapter**: Implements repository interfaces using actual technologies (PostgreSQL storage, Redis caching, gRPC network calls).
- **Cmd**: Bootstraps the application, loading configurations, connecting databases, and launching HTTP listeners.
