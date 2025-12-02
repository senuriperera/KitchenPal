# KitchenPal Backend - Quick Start Script
# This script helps you get started with the KitchenPal backend

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "    KitchenPal Backend Setup" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

try {
    docker --version | Out-Null
    Write-Host "[OK] Docker is installed" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

try {
    docker-compose --version | Out-Null
    Write-Host "[OK] Docker Compose is installed" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker Compose is not installed." -ForegroundColor Red
    exit 1
}

# Check if .env file exists
if (-not (Test-Path "backend\.env")) {
    Write-Host "Creating backend\.env file from backend\.env.example..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "[OK] backend\.env file created. You may want to edit it before continuing." -ForegroundColor Green
    
    $continue = Read-Host "Do you want to continue with default settings? (Y/n)"
    if ($continue -eq "n") {
        Write-Host "Please edit backend\.env file and run this script again." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "Starting KitchenPal Backend..." -ForegroundColor Cyan
Write-Host ""

# Stop any existing containers
Write-Host "Stopping existing containers..." -ForegroundColor Yellow
docker-compose down 2>&1 | Out-Null

# Start services
Write-Host "Starting PostgreSQL and Backend containers..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] Services started successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Wait for services to be ready
    Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Test the API
    Write-Host "Testing API connection..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "[OK] API is responding!" -ForegroundColor Green
        }
    } catch {
        Write-Host "[WARNING] API might still be starting up. Please wait a moment and try again." -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host "  KitchenPal Backend is Running!" -ForegroundColor Cyan
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  API URL:        http://localhost:3000/api" -ForegroundColor White
    Write-Host "  Health Check:   http://localhost:3000/api/health" -ForegroundColor White
    Write-Host "  Database:       localhost:5433" -ForegroundColor White
    Write-Host "  pgAdmin:        http://localhost:5050" -ForegroundColor White
    Write-Host ""
    Write-Host "  pgAdmin Login:" -ForegroundColor Yellow
    Write-Host "    Email:        admin@kitchenpal.com" -ForegroundColor White
    Write-Host "    Password:     admin123" -ForegroundColor White
    Write-Host ""
    Write-Host "  Database Connection (in pgAdmin):" -ForegroundColor Yellow
    Write-Host "    Host:         postgres" -ForegroundColor White
    Write-Host "    Port:         5432" -ForegroundColor White
    Write-Host "    Database:     kitchenpal" -ForegroundColor White
    Write-Host "    Username:     postgres" -ForegroundColor White
    Write-Host "    Password:     postgres123" -ForegroundColor White
    Write-Host ""
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Documentation:" -ForegroundColor Yellow
    Write-Host "   - README.md - Complete setup guide" -ForegroundColor White
    Write-Host "   - API_TESTING_GUIDE.md - API testing examples" -ForegroundColor White
    Write-Host ""
    Write-Host "Useful Commands:" -ForegroundColor Yellow
    Write-Host "   - View logs:        docker-compose logs -f" -ForegroundColor White
    Write-Host "   - Stop services:    docker-compose down" -ForegroundColor White
    Write-Host "   - Restart:          docker-compose restart" -ForegroundColor White
    Write-Host "   - View containers:  docker-compose ps" -ForegroundColor White
    Write-Host ""
    
    # Ask if user wants to see logs
    $viewLogs = Read-Host "Do you want to view the logs? (y/N)"
    if ($viewLogs -eq "y") {
        docker-compose logs -f
    }
    
} else {
    Write-Host ""
    Write-Host "[ERROR] Failed to start services. Please check the error messages above." -ForegroundColor Red
    Write-Host ""
    exit 1
}
