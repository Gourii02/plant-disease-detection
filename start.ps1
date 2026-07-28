# =============================================================================
# PlantGuard AI -- Project Startup Script
# Run this from the project root: .\start.ps1
# =============================================================================

$ROOT = $PSScriptRoot

Write-Host ""
Write-Host "PlantGuard AI -- Starting all services..." -ForegroundColor Green
Write-Host ""

# -- 1. Go Core Service (:8080) -----------------------------------------------
Write-Host "Starting Go Core Service on :8080..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "cd '$ROOT\services\core-service'; Write-Host '[Core Service]' -ForegroundColor Cyan; go run ./cmd/main.go"

# -- 2. Python AI Service (:8000) ---------------------------------------------
Write-Host "Starting Python AI Service on :8000..." -ForegroundColor Yellow
$uvicorn = "$ROOT\services\ai-service\venv\Scripts\uvicorn.exe"
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "cd '$ROOT\services\ai-service'; Write-Host '[AI Service]' -ForegroundColor Yellow; & '$uvicorn' app.main:app --host 0.0.0.0 --port 8000 --reload"

# -- 3. React Web App (:5173) -------------------------------------------------
Write-Host "Starting React Web App on :5173..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "cd '$ROOT\apps\web-app'; Write-Host '[Web App]' -ForegroundColor Magenta; npm run dev"

Write-Host ""
Write-Host "All services launched in separate windows." -ForegroundColor Green
Write-Host ""
Write-Host "  Web App  : http://localhost:5173" -ForegroundColor White
Write-Host "  Core API : http://localhost:8080" -ForegroundColor White
Write-Host "  AI API   : http://localhost:8000" -ForegroundColor White
Write-Host ""
