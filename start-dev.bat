@echo off
setlocal

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000') do taskkill /f /pid %%a >nul 2>&1

start "Backend" cmd /k "cd /d backend && .\.venv\Scripts\python -m uvicorn main:app --reload"
start "Frontend" cmd /k "cd /d frontend && npm run dev"
code -r .

exit /b
