# Engineering Program Manager

Engineering Program Manager is a full‑stack SaaS application for managing engineering programs, sprints, risks, and delivery metrics.

Stack: Next.js 14 (App Router, TypeScript), Node.js/Express, MongoDB (Mongoose), TailwindCSS, Docker.

## Features

- **Program management**: create programs, define milestones, and track engineering initiatives.
- **Agile sprints & Kanban**: create sprints, manage tasks across Kanban columns, assign tasks, and see sprint progress.
- **Risk management**: log risks, set severity and mitigation plans, and track status.
- **Metrics dashboard**: view sprint velocity, deployment frequency, bug rate, and feature completion \%.
- **Stakeholder reports**: auto‑generated program status JSON plus downloadable PDF.
- **AI assistance** (optional): predict sprint delays and summarize weekly status using OpenAI if `OPENAI_API_KEY` is configured.
- **Authentication & RBAC**: email/password login & signup with `manager` and `engineer` roles.
- **Modern UI**: responsive dashboard layout, TailwindCSS styling, and dark mode toggle.

## Project structure

```text
.
├─ backend/          # Express REST API (auth, programs, sprints, risks, metrics, reports, AI)
│  ├─ src/
│  │  ├─ config/     # Mongo connection
│  │  ├─ middleware/ # auth, error handling
│  │  ├─ models/     # Mongoose models
│  │  └─ routes/     # REST endpoints
│  ├─ Dockerfile
│  └─ tsconfig.json
├─ frontend/         # Next.js 14 app router UI
│  ├─ app/           # pages: auth, dashboard, programs, sprints, risks, reports
│  ├─ src/components # shared UI shell
│  ├─ src/lib/       # API client & types
│  ├─ src/store/     # zustand stores (auth, theme)
│  └─ Dockerfile
├─ docker-compose.yml
└─ package.json      # root scripts for dev/build
```

## Environment configuration

### Backend (`backend/.env`)

Copy the example file and adjust:

```bash
cp backend/.env.example backend/.env
```

Key variables:

- **`PORT`**: API port (default `5000`).
- **`MONGODB_URI`**: Mongo connection string (e.g. `mongodb://localhost:27017/epm`).
- **`JWT_SECRET`**: long random secret for signing JWTs.
- **`OPENAI_API_KEY`** (optional): if set, AI endpoints use OpenAI; otherwise built‑in heuristic fallbacks are used.
- **`FRONTEND_URL`**: frontend origin for CORS in local/dev (e.g. `http://localhost:3000`).

### Frontend (`frontend/.env.local`)

For local dev you normally use the Next.js rewrite to `/api/proxy` and **do not** need this variable. If you want to bypass the proxy and hit the API directly, set:

```bash
cp frontend/.env.local.example frontend/.env.local
```

- **`NEXT_PUBLIC_API_URL`**: base URL for API (e.g. `http://localhost:5000` or `http://backend:5000` in Docker).

## Local development

1. **Install dependencies**

```bash
cd agile-program-management-system
npm install           # root (concurrently)
cd backend && npm install
cd ../frontend && npm install
```

2. **Configure env files**

- `backend/.env` from `.env.example`.
- Optional `frontend/.env.local` if not using the built‑in proxy.

3. **Run MongoDB**

- Easiest via Docker:

```bash
docker run --name epm-mongo -p 27017:27017 -d mongo:7
```

or point `MONGODB_URI` at an existing MongoDB instance.

4. **Start dev servers**

From the project root:

```bash
npm run dev
```

This runs:

- Backend API on `http://localhost:5000/api`.
- Next.js frontend on `http://localhost:3000` (proxying `/api/proxy/*` to the backend).

### Auth & roles

- Sign up via `/signup` and log in via `/login`.
- Choose `manager` or `engineer` when signing up.
- Protected API routes use JWT bearer tokens; the frontend stores the token via a small zustand store.

## Docker setup

The repo includes production‑oriented Dockerfiles and a `docker-compose.yml`.

### Build & run with Docker Compose

From the project root:

```bash
docker compose build
docker compose up -d
```

This starts:

- `mongo` on `27017`.
- `backend` on `http://localhost:5000`.
- `frontend` on `http://localhost:3000`.

Environment in Compose:

- Backend:
  - `MONGODB_URI=mongodb://mongo:27017/epm`
  - `PORT=5000`
  - `JWT_SECRET=change-me-in-prod` (override in real deployments)
  - `OPENAI_API_KEY` (passed through if set in your shell)
  - `FRONTEND_URL=http://localhost:3000`
- Frontend:
  - `NEXT_PUBLIC_API_URL=http://backend:5000`

Stop the stack:

```bash
docker compose down
```

## Deployment guide (high level)

You can deploy using any platform that supports Docker (ECS, Kubernetes, Azure Container Apps, etc.) or by running backend and frontend images separately.

1. **Build images**

```bash
cd agile-program-management-system
docker build -t epm-backend ./backend
docker build -t epm-frontend ./frontend
```

2. **Provision infrastructure**

- Managed MongoDB instance (Atlas, DocumentDB, Cosmos, etc.).
- Container runtime for the backend (and optionally frontend).
- TLS termination / reverse proxy (NGINX, load balancer, or platform‑provided).

3. **Configure environment**

- For backend container:
  - `MONGODB_URI` pointing to managed Mongo.
  - `PORT` (e.g. `5000`).
  - `JWT_SECRET` set to a strong value from your secret manager.
  - `OPENAI_API_KEY` if AI features should use OpenAI.
  - `FRONTEND_URL` set to the final frontend origin.
- For frontend container:
  - `NEXT_PUBLIC_API_URL` set to the backend URL reachable from the browser (e.g. `https://api.your-domain.com`).

4. **Run containers**

- Expose the frontend on `80/443` via your platform.
- Expose the backend behind an API domain or path (`/api`).
- Ensure CORS `FRONTEND_URL` matches the frontend origin.

5. **Post‑deployment checks**

- Hit `/api/health` on the backend.
- Load the app in the browser, sign up, create a program, sprint, and risk.
- Verify dashboard metrics, AI endpoints (if configured), and PDF report download.

## REST API overview

Base URL (backend): `/api`

- **Auth**
  - `POST /auth/signup`
  - `POST /auth/login`
  - `GET /auth/me`
- **Programs**
  - `GET /programs`
  - `POST /programs`
  - `GET /programs/:id`
  - `PATCH /programs/:id`
  - `DELETE /programs/:id`
  - `POST /programs/:id/milestones`
  - `PATCH /programs/:id/milestones/:milestoneId`
  - `POST /programs/:id/initiatives`
  - `PATCH /programs/:id/initiatives/:initiativeId`
- **Sprints & tasks**
  - `GET /sprints`
  - `POST /sprints`
  - `GET /sprints/:id`
  - `PATCH /sprints/:id`
  - `POST /sprints/:id/tasks`
  - `PATCH /sprints/:id/tasks/:taskId`
  - `DELETE /sprints/:id/tasks/:taskId`
- **Risks**
  - `GET /risks`
  - `POST /risks`
  - `GET /risks/:id`
  - `PATCH /risks/:id`
  - `DELETE /risks/:id`
- **Metrics**
  - `GET /metrics/dashboard`
  - `POST /metrics/snapshot`
- **Reports**
  - `GET /reports/status`
  - `GET /reports/status/pdf`
- **AI**
  - `GET /ai/predict-delay`
  - `GET /ai/weekly-summary`

All non‑auth endpoints require a `Bearer` token in `Authorization` or a `token` query parameter (used by the PDF download).

