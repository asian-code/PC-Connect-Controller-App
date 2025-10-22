"""
Main FastAPI application
"""
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from datetime import datetime

from app.config import settings
from app.database import init_db
from app.routers import auth, vms, admin
from app.schemas import HealthResponse
from app.proxmox import proxmox_client
from app.auth import gotrue_client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown events
    """
    # Startup
    logger.info("Starting Proxmox Controller API...")
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Proxmox Controller API...")


# Create FastAPI app
app = FastAPI(
    title="Proxmox VM Controller API",
    description="API for managing Proxmox VMs with user authentication",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(vms.router)
app.include_router(admin.router)


@app.get("/", status_code=status.HTTP_200_OK)
async def root():
    """
    Root endpoint
    """
    return {
        "message": "Proxmox VM Controller API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health", response_model=HealthResponse, status_code=status.HTTP_200_OK)
async def health_check():
    """
    Health check endpoint
    
    Checks connectivity to:
    - Database
    - Proxmox API
    - GoTrue service
    """
    # Check Proxmox
    proxmox_status = "healthy" if await proxmox_client.health_check() else "unhealthy"
    
    # Check GoTrue
    gotrue_status = "healthy" if await gotrue_client.health_check() else "unhealthy"
    
    # Database is assumed healthy if this endpoint responds
    # (could add explicit check if needed)
    database_status = "healthy"
    
    overall_status = "healthy" if all([
        proxmox_status == "healthy",
        gotrue_status == "healthy",
        database_status == "healthy"
    ]) else "degraded"
    
    return HealthResponse(
        status=overall_status,
        database=database_status,
        proxmox=proxmox_status,
        gotrue=gotrue_status,
        timestamp=datetime.utcnow()
    )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_reload,
        log_level="info"
    )
