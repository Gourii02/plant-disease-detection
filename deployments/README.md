# Deployments & Infrastructure-as-Code

This directory contains container configurations and orchestration files used to run and scale the services.

## Folders
- **docker/**: Multi-stage Dockerfiles for constructing runtime containers.
  - `core-service.Dockerfile`: Container for the Go core application.
  - `ai-service.Dockerfile`: Container for FastAPI python routers.
- **k8s/**: Kubernetes YAML templates and Helm configurations.
  - `deployment.yaml`: Replicated Pod sets with Horizontal Pod Autoscaling (HPA).
  - `ingress.yaml`: Ingress controllers linking Kong gateway.
  - `triton-deployment.yaml`: Specialized GPU configuration pods for AI servers.
- **terraform/**: Infrastructure configurations mapping AWS cloud environments.
