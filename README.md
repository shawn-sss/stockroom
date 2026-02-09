# Stockroom

<p align="center">
  <img width="1200" height="475" src="screenshot.jpg" alt="Screenshot">
</p>

Stockroom is a lightweight asset inventory app for tracking what is in stock, deployed, or retired, and who has each item.

## Features

- Item lifecycle: add, edit, deploy, return, retire, restore
- Search + filters + sorting + pagination
- Per-item audit history and user-management audit logs
- Role-based access (`owner`, `admin`, `user`)
- Production app-shell caching via service worker

## Tech stack

- Backend: FastAPI, SQLite, JWT auth
- Frontend: React + Vite + TypeScript

## Quick start

Requires Node.js and Python 3 on your PATH.

Install dependencies:

```bash
node scripts/bootstrap.js
```

Run dev:

```bash
node scripts/run-dev.js
```

Run production-style preview:

```bash
node scripts/run-prod.js
```

## Default seeded users (first run)

- `owner` / `owner`
- `admin` / `admin`
- `user` / `user`

The backend starts at `http://127.0.0.1:8000` and the frontend at `http://localhost:5173` in dev mode.
