# Stockroom

<p align="center">
  <img src="screenshot.jpg" alt="screenshot">
</p>

Stockroom is a lightweight inventory tracker for assets. It helps teams keep
tabs on what is in stock, what is deployed, and who has it.

## Features

- Track assets with status (in stock, deployed, retired) and assignment history
- Search, filter, sort, and paginate inventory
- Audit trail per item (adds, edits, deploys, returns, retires, restores)
- Role-based access (owner, admin, user) with user management and audit logs

## Tech stack

- Backend: FastAPI, SQLite, JWT auth
- Frontend: React, Vite

## Setup

### Windows

Start dev servers (backend at `http://127.0.0.1:8000`, frontend at `http://localhost:5173`)

```
start-dev.bat
```

Production-like preview (builds the frontend and runs the API + Vite preview)

```
start-prod.bat
```

### Linux

```bash
chmod +x start-dev.sh start-prod.sh
```

Start dev servers (backend at `http://127.0.0.1:8000`, frontend at `http://localhost:5173`)

```bash
./start-dev.sh
```

Production-like preview (builds the frontend and runs the API + Vite preview)

```bash
./start-prod.sh
```
