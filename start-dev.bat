@echo off
echo Starting Swipe2Export Dev Environment...
echo.
echo [1/2] Starting FastAPI backend on http://localhost:8000
start "FastAPI Backend" cmd /k "cd backend && pip install -r requirements.txt -q && uvicorn main:app --reload --port 8000"
timeout /t 3 /nobreak >nul
echo [2/2] Starting React frontend on http://localhost:8080
start "React Frontend" cmd /k "npm run dev"
echo.
echo Both services started. Open http://localhost:8080 in your browser.
