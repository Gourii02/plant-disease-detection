# PlantGuard AI — Plant Disease Detection Platform

> An AI-powered platform for identifying plant species and diseases from leaf images, with explainable AI diagnostics, treatment recommendations, and real-time updates.

---

## Tech Stack

| Layer | Technology |
|:---|:---|
| **Web Frontend** | React 19, Vite, Vanilla CSS |
| **Core API** | Go 1.21, Gin, GORM, PostgreSQL |
| **AI Service** | Python 3.13, FastAPI, PyTorch, Triton Inference Server |
| **Background Jobs** | Celery, RabbitMQ |
| **Real-time** | WebSockets (Go) |
| **Database** | PostgreSQL 15 |

---

## Repository Structure

```
plant-disease-detection/
├── apps/
│   ├── mobile/             # Mobile client (future — Flutter)
│   └── web-app/            # Web client (React + Vite, runs on :5173)
├── services/
│   ├── core-service/       # Go business logic service (:8080)
│   ├── ai-service/         # Python AI inference service (:8000)
│   └── api-gateway/        # API gateway (future)
├── ml/                     # ML model cards, dataset strategy
├── deployments/            # Deployment documentation
├── docker-compose.yml      # Local full-stack orchestration
└── dashboard.html          # Interactive system architecture visualizer
```

---

## Getting Started

### Prerequisites

- [Go 1.21+](https://go.dev/dl/)
- [Python 3.11+](https://www.python.org/downloads/)
- [Node.js 18+](https://nodejs.org/)
- [PostgreSQL 15](https://www.postgresql.org/download/)

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/plant-disease-detection.git
cd plant-disease-detection
```

### 2. Configure the Go Core Service

```bash
cd services/core-service

# Copy the example config and fill in your local values
cp config.example.yaml config.yaml

# Edit config.yaml — set your DB credentials and JWT secret
```

### 3. Run the Go Core Service

```bash
# From services/core-service/
go mod download
go run ./cmd/main.go
# Runs on http://localhost:8080
```

### 4. Configure the Python AI Service

```bash
cd services/ai-service

# Create a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp ../../.env.example .env
```

### 5. Run the Python AI Service

```bash
# From services/ai-service/ with venv active
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# Runs on http://localhost:8000
```

### 6. Run the Web Frontend

```bash
cd apps/web-app
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## API Overview

### Authentication

| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/v1/auth/signup` | Register a new user |
| `POST` | `/api/v1/auth/login` | Login and receive JWT |

### Diagnosis

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `POST` | `/api/v1/diagnose` | ✅ | Submit a leaf image URL for AI diagnosis |
| `GET` | `/api/v1/diagnose/:id` | ✅ | Get a diagnosis result by ID |
| `GET` | `/api/v1/history` | ✅ | Get the authenticated user's scan history |

### Treatments

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/v1/treatments` | List all disease treatment entries |
| `GET` | `/api/v1/treatments/:key` | Get treatment recommendations for a disease |

### Health

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/v1/health` | Service health check including DB status |

---

## Development Workflow

This project uses a **feature branch** Git workflow. All development happens on feature branches — never directly on `main`.

```
main              — production-ready, always stable
feature/auth      — authentication, JWT refresh, roles
feature/ui        — React web app development
feature/backend   — Go core service endpoints and DB
feature/disease-detection  — AI pipeline, Triton, Celery
```

### Creating a Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
# ... do your work ...
git push -u origin feature/your-feature-name
# Open a Pull Request on GitHub: feature/your-feature → main
```

---

## Environment Variables

Copy `.env.example` to `.env` for the AI service, and `services/core-service/config.example.yaml` to `config.yaml` for the Go service. See each file for descriptions of required variables.

> ⚠️ Never commit `config.yaml` or `.env` files with real credentials.

---

## License

MIT
