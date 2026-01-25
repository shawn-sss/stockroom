@echo off
setlocal EnableDelayedExpansion

set "ROOT=%~dp0"
pushd "%ROOT%"

echo Cleaning build artifacts and caches...
set "FOUND=0"
set "LOG=%TEMP%\clean-artifacts-log.txt"
if exist "%LOG%" del /q "%LOG%"

echo Found items:>>"%LOG%"

REM Backend virtual env
if exist "backend\.venv" (
  echo - backend\.venv>>"%LOG%"
  set "FOUND=1"
  rmdir /s /q "backend\.venv"
)

REM Frontend dependencies and build output
if exist "frontend\node_modules" (
  echo - frontend\node_modules>>"%LOG%"
  set "FOUND=1"
  rmdir /s /q "frontend\node_modules"
)
if exist "frontend\dist" (
  echo - frontend\dist>>"%LOG%"
  set "FOUND=1"
  rmdir /s /q "frontend\dist"
)

REM Python caches
for /f "delims=" %%D in ('dir /b /s /a:d "__pycache__" 2^>nul') do (
  echo - %%D>>"%LOG%"
  set "FOUND=1"
  rmdir /s /q "%%D"
)
for /f "delims=" %%F in ('dir /b /s /a:-d "*.pyc" 2^>nul') do (
  echo - %%F>>"%LOG%"
  set "FOUND=1"
  del /q "%%F"
)
for /f "delims=" %%F in ('dir /b /s /a:-d "*.pyo" 2^>nul') do (
  echo - %%F>>"%LOG%"
  set "FOUND=1"
  del /q "%%F"
)

REM Tool caches
if exist ".pytest_cache" (
  echo - .pytest_cache>>"%LOG%"
  set "FOUND=1"
  rmdir /s /q ".pytest_cache"
)
if exist ".mypy_cache" (
  echo - .mypy_cache>>"%LOG%"
  set "FOUND=1"
  rmdir /s /q ".mypy_cache"
)
if exist ".ruff_cache" (
  echo - .ruff_cache>>"%LOG%"
  set "FOUND=1"
  rmdir /s /q ".ruff_cache"
)

REM Logs
for /f "delims=" %%F in ('dir /b /s /a:-d "*.log" 2^>nul') do (
  echo - %%F>>"%LOG%"
  set "FOUND=1"
  del /q "%%F"
)

REM Env files (if present)
if exist ".env" (
  echo - .env>>"%LOG%"
  set "FOUND=1"
  del /q ".env"
)
for %%F in (.env.*) do (
  if exist "%%F" (
    echo - %%F>>"%LOG%"
    set "FOUND=1"
    del /q "%%F"
  )
)

REM App database (uncomment if you want it removed for backups)
REM if exist "backend\app.db" del /q "backend\app.db"

popd
if "%FOUND%"=="1" (
  echo.
  type "%LOG%"
) else (
  echo.
  echo Found items:
  echo - (none)
)
if exist "%LOG%" del /q "%LOG%"
echo Done.
pause
exit /b
