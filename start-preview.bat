@echo off
echo Starting Rebel Hounds MC Finance Dashboard Preview...
echo.
echo Server running at: http://localhost:8000/portal-finance.html
echo.
echo Press Ctrl+C to stop the server
echo.
cd /d "C:\Users\Jayt1\OneDrive\Documents\Default Project\rebel-hounds-mc"
python -m http.server 8000
