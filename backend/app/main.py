import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import auth, radiology, reports

app = FastAPI(title="IntPatient API", version="1.0.0")

# CORS middleware
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(radiology.router, prefix="/api")
app.include_router(reports.router, prefix="/api")


@app.on_event("startup")
def on_startup():
    init_db()
    # Create upload directories
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "radiology"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "reports"), exist_ok=True)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
