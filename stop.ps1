# Stop KitchenPal Backend Services

Write-Host "
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║         🛑  Stopping KitchenPal Backend  🛑           ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

Write-Host "Stopping containers..." -ForegroundColor Yellow
docker-compose down

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ All services stopped successfully!" -ForegroundColor Green
    Write-Host ""
    
    $removeData = Read-Host "Do you want to remove all data (database volumes)? (y/N)"
    if ($removeData -eq "y") {
        Write-Host "Removing volumes..." -ForegroundColor Yellow
        docker-compose down -v
        Write-Host "✅ All data removed!" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Failed to stop services." -ForegroundColor Red
}

Write-Host ""
