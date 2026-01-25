@echo off
setlocal

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000') do taskkill /f /pid %%a >nul 2>&1

set "ROOT=%~dp0"
set "VITE_API_BASE=http://127.0.0.1:8000/api"

pushd "%ROOT%frontend"
call npm run build

popd

start "Backend" cmd /k "cd /d ""%ROOT%backend"" && .\.venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8000"
start "Frontend" cmd /k "cd /d ""%ROOT%frontend"" && npm run preview -- --host 127.0.0.1 --port 5173"

exit /b
