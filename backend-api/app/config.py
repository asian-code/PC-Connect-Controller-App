"""
Configuration management for the Proxmox Controller API
"""
from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # Database
    database_url: str = "postgresql+asyncpg://proxmox_user:proxmox_password@localhost:5432/proxmox_controller"
    database_url_sync: str = "postgresql://proxmox_user:proxmox_password@localhost:5432/proxmox_controller"
    
    # Proxmox
    proxmox_host: str = "11.11.11.11"
    proxmox_port: int = 8006
    proxmox_user: str = "cc@pam"
    proxmox_token_name: str = "cc"
    proxmox_token_value: str = "df52c07c-34b9-4b84-a695-02e64a49d97d"
    proxmox_verify_ssl: bool = False
    proxmox_node: str = "pve"
    
    # GoTrue
    gotrue_url: str = "http://localhost:9999"
    gotrue_jwt_secret: str = "your-super-secret-jwt-key-change-this-in-production"
    gotrue_admin_email: str = "admin@example.com"
    gotrue_admin_password: str = "change-this-admin-password"
    
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_reload: bool = True
    cors_origins: List[str] = ["http://localhost:19006", "exp://192.168.1.100:19000"]
    
    # Security
    secret_key: str = "your-super-secret-key-change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Environment
    environment: str = "development"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Create settings instance
settings = Settings()
