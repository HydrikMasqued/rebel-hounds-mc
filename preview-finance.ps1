Write-Host "Starting Rebel Hounds MC Finance Dashboard Preview..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Server running at: http://localhost:8000/portal-finance.html" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

Set-Location "C:\Users\Jayt1\OneDrive\Documents\Default Project\rebel-hounds-mc"

# Start the server
$server = Start-Process -FilePath "python" -ArgumentList "-m http.server 8000" -NoNewWindow -PassThru

# Wait a moment for server to start
Start-Sleep -Seconds 2

# Open the browser
Start-Process "http://localhost:8000/portal-finance.html"

Write-Host "Browser opened! Login with: HFFH / HoundsForever" -ForegroundColor Green
Write-Host ""

# Keep the script running until user presses Ctrl+C
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    # Stop the server when script is interrupted
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
    Write-Host "Server stopped." -ForegroundColor Yellow
}
