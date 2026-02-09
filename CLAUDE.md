# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

IntPatient - Hospital web application (POC) for receiving radiology images and doctor reports from foreign patients. Uploads radiology images to disk, extracts text from report images/PDFs via OCR (Ollama), translates to Turkish via UpperMind AI, and stores everything in SQLite.

## Development Commands

### Backend
- Install deps: `pip install -r backend/requirements.txt`
- Run server: `cd backend && uvicorn app.main:app --reload`
- Run all tests: `python -m pytest backend/tests/ -v`
- Run single test file: `python -m pytest backend/tests/test_auth.py -v`
- Run single test: `python -m pytest backend/tests/test_auth.py::TestLogin::test_login_success -v`

### Frontend
- Install deps: `cd frontend && npm install`
- Dev server: `cd frontend && npm run dev`
- Build: `cd frontend && npm run build`
- Type check: `cd frontend && npx tsc --noEmit`

### Docker
- Build & run all: `docker-compose up --build`
- Backend only: `docker-compose up backend`
- Frontend only: `docker-compose up frontend`

## Architecture

- **Backend**: Python 3.12+ / FastAPI / SQLAlchemy (sync, SQLite)
- **Frontend**: React 18 / Vite / TypeScript / React Router / Axios
- **OCR**: Ollama with `deepseek-ocr` model (non-streaming API)
- **Translation**: UpperMind `/chat/noninteractive` endpoint
- **Auth**: Proxied through UpperMind API (`/auth/token`, `/auth/me`)
- **UI Language**: Turkish

### Key directories
- `backend/app/routers/` - FastAPI route handlers (auth, radiology, reports)
- `backend/app/services/` - External service clients (uppermind, ocr, pdf)
- `backend/app/models.py` - SQLAlchemy models (Record, UploadedFile, Translation)
- `frontend/src/pages/` - React page components
- `frontend/src/components/` - Reusable React components
- `frontend/src/hooks/` - React hooks (useAuth)
- `frontend/src/api/` - Axios client with auth interceptor

### Mock patterns for tests
- Mock where functions are **imported** (e.g., `app.routers.auth.authenticate`), not where they're defined (`app.services.uppermind.authenticate`)
- OCR/PDF mocks: patch at `app.routers.reports.extract_text_from_image` and `app.routers.reports.extract_from_pdf`
- Auth mocks: patch at `app.routers.auth.authenticate` and `app.routers.auth.get_user`
- Translate mock: patch at `app.routers.reports.translate`
