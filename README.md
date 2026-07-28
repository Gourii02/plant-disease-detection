# PlantGuard AI — Plant Disease Detection Platform

[![Go](https://img.shields.io/badge/Go-1.21+-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

> An enterprise-grade polyglot microservices platform for real-time plant species identification and disease diagnosis using deep learning (HuggingFace Vision Transformers + MobileNetV2), explainable AI (Grad-CAM heatmaps), and Gemini 2.0 Flash VLM verification.

---

## 🌐 Live Demo & Deployment

| Service | Live URL | Hosting Recommendation |
|:---|:---|:---|
| **Web Application (React 19)** | [Deploying via Vercel / GitHub Pages](#-deploying-the-web-app) | Vercel / Netlify |
| **Core Business API (Go)** | `http://localhost:8080` | Render / Railway / AWS EC2 |
| **AI Inference API (Python)** | `http://localhost:8000` | Render / AWS ECS / Modal |

### 🚀 Deploying the Web App to Vercel (Free 2-Minute Deployment)

1. Go to [Vercel](https://vercel.com/) and click **Add New Project**.
2. Select repository: `Gourii02/plant-disease-detection`.
3. Set **Root Directory** to `apps/web-app`.
4. Framework Preset: **Vite**.
5. Click **Deploy**. Vercel will automatically build and publish your web app with a live link!

---

## 🛠️ Architecture & Tech Stack

```
                                  ┌────────────────────────┐
                                  │   React 19 Frontend    │
                                  │      (Vite + CSS)      │
                                  └───────────┬────────────┘
                                              │ HTTP / WS
                                              ▼
                                  ┌────────────────────────┐
                                  │   Go Core Service      │
                                  │ (Gin, GORM, JWT Auth)  │
                                  └─────┬──────────────┬───┘
                                        │              │
                           SQL Queries  │              │ RabbitMQ AMQP
                                        ▼              ▼
                              ┌───────────┐      ┌───────────┐
                              │ PostgreSQL│      │ Celery    │
                              │  Database │      │ Worker    │
                              └───────────┘      └─────┬─────┘
                                                       │ HTTP / gRPC
                                                       ▼
                                          ┌────────────────────────┐
                                          │   Python AI Service    │
                                          │ (FastAPI + HuggingFace)│
                                          └────────────────────────┘
```

| Layer | Technology | Key Capabilities |
|:---|:---|:---|
| **Web Client** | React 19, Vite, Vanilla CSS | Real-time WebSocket diagnostics, dashboard analytics, treatment guide |
| **Core API** | Go 1.21, Gin, GORM, JWT | Auth management, diagnosis history, WebSocket broadcasting |
| **AI Engine** | Python 3.11+, FastAPI, PyTorch | 38-class plant disease classification, Grad-CAM XAI heatmaps |
| **VLM Verifier** | Gemini 2.0 Flash Vision API | Open-set out-of-distribution pathogen verification |
| **Async Pipeline**| Celery, RabbitMQ, Redis | Asynchronous ML batch processing & retry queues |
| **Database** | PostgreSQL 15 | Relational persistence for users, diagnoses, and treatments |

---

## 📂 Repository Structure

```
plant-disease-detection/
├── apps/
│   └── web-app/            # Production React 19 web application (Vite)
├── services/
│   ├── core-service/       # Go core business API & WebSocket hub (:8080)
│   ├── ai-service/         # Python FastAPI ML inference service (:8000)
│   └── api-gateway/        # API Gateway documentation & routing specs
├── ml/                     # ONNX model export scripts & Triton configurations
├── deployments/            # Infrastructure deployment documentation
├── docker-compose.yml      # Multi-container orchestration (8 services)
└── start.ps1               # Automated developer startup script
```

---

## 🚦 Quick Start Guide

### Option 1: Docker Compose (Recommended — Starts All 8 Services)

```bash
git clone https://github.com/Gourii02/plant-disease-detection.git
cd plant-disease-detection
docker-compose up --build
```

Access the interfaces:
- **Web Dashboard**: `http://localhost:3000`
- **Go API Health**: `http://localhost:8080/api/v1/health`
- **FastAPI Inference Docs**: `http://localhost:8000/docs`
- **RabbitMQ Management**: `http://localhost:15672` (guest/guest)

---

### Option 2: Local Manual Startup

#### 1. Start Go Core Service
```bash
cd services/core-service
go run ./cmd/main.go
```

#### 2. Start Python AI Service
```bash
cd services/ai-service
python -m venv venv
venv\Scripts\activate      # Windows
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
```

#### 3. Start React Frontend
```bash
cd apps/web-app
npm install
npm run dev
```

---

## 🧪 Testing

Run backend unit tests for the Go service:

```bash
cd services/core-service
go test ./internal/usecase/... -v
```

---

## 📡 API Reference

### Authentication & Profile
| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `POST` | `/api/v1/auth/signup` | ❌ | Register user account |
| `POST` | `/api/v1/auth/login` | ❌ | Authenticate and obtain JWT |
| `GET` | `/api/v1/users/me` | ✅ | Fetch user profile |
| `PUT` | `/api/v1/users/me` | ✅ | Update profile details |

### Diagnostics & WebSocket
| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `POST` | `/api/v1/diagnose/upload` | ✅ | Direct leaf image upload & synchronous inference |
| `POST` | `/api/v1/diagnose` | ✅ | Submit leaf image URL for async Celery task processing |
| `GET` | `/api/v1/history` | ✅ | Retrieve authenticated user's scan history |
| `GET` | `/api/v1/ws` | ✅ | Real-time WebSocket connection for live notification updates |

### Treatments & Knowledge Base
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/v1/treatments` | List treatments for all 28 supported plant diseases |
| `GET` | `/api/v1/treatments/:key` | Retrieve specific organic & chemical remedies for a disease |

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.
