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
- Frontend: React, Vite, TypeScript

## Setup

All helper scripts under `scripts/` are cross-platform and orchestrate both backend and frontend tasks (Node.js and Python 3 are required on your PATH).

### Bootstrap dependencies

Installs the backend virtualenv (and Python dependencies) plus all frontend npm packages.

```bash
node scripts/bootstrap.js
```

### Development

Runs the backend (Uvicorn with reload) and the frontend dev server concurrently, killing any prior services bound to ports 8000/5173 first.

```bash
node scripts/run-dev.js
```

Addresses:

- Backend: http://127.0.0.1:8000
- Frontend: http://localhost:5173

### Production-style preview

Builds the frontend with `VITE_API_BASE` pointing at the backend, then opens the backend/preview servers side-by-side.

```bash
node scripts/run-prod.js
```
