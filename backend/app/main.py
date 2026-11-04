from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import (
    AppException,
    app_exception_handler,
    generic_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from app.database.connection import init_db
from app.routers import (
    approvals,
    approved_facts,
    auth,
    brands,
    dashboard,
    findings,
    guidelines,
    health,
    submissions,
    terminology,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    try:
        init_db()
    except Exception as e:
        print(f"[Startup Warning] Could not initialize DB schema automatically: {e}")
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="Reality bRand Check AI - Backend API for brand governance and content compliance.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Mount all API v1 routes
api_prefix = settings.API_V1_PREFIX

app.include_router(health.router, prefix=api_prefix)
app.include_router(health.router)  # root /health convenience alias
app.include_router(auth.router, prefix=api_prefix)
app.include_router(brands.router, prefix=api_prefix)
app.include_router(guidelines.router, prefix=api_prefix)
app.include_router(terminology.router, prefix=api_prefix)
app.include_router(approved_facts.router, prefix=api_prefix)
app.include_router(submissions.router, prefix=api_prefix)
app.include_router(findings.router, prefix=api_prefix)
app.include_router(approvals.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)


@app.get("/")
def root():
    return {
        "success": True,
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "api_v1": settings.API_V1_PREFIX,
    }
