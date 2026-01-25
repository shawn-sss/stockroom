@echo off
setlocal

cd /d backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt

cd /d ..\frontend
npm install

exit /b
