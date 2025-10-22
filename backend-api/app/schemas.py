"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ============= Enums =============

class VMStatus(str, Enum):
    """VM status enum"""
    running = "running"
    stopped = "stopped"
    paused = "paused"
    unknown = "unknown"


class UserRole(str, Enum):
    """User role enum"""
    admin = "admin"
    user = "user"


# ============= Auth Schemas =============

class UserLogin(BaseModel):
    """Login request schema"""
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserCreate(BaseModel):
    """User creation request schema (admin only)"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    is_admin: bool = False


class UserResponse(BaseModel):
    """User response schema"""
    id: str
    email: str
    is_admin: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Token response schema"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


# ============= VM Schemas =============

class VMBase(BaseModel):
    """Base VM schema"""
    vm_id: int
    vm_name: Optional[str] = None


class VMStatus(BaseModel):
    """VM status schema"""
    vm_id: int
    vm_name: str
    status: str  # running, stopped, paused
    uptime: Optional[int] = None  # seconds
    cpu: Optional[float] = None  # percentage
    memory: Optional[int] = None  # bytes
    

class VMResponse(BaseModel):
    """VM response with status"""
    vm_id: int
    vm_name: str
    status: str
    uptime: Optional[int] = None
    assigned_user: Optional[str] = None  # Email of assigned user
    can_control: bool = True  # Whether current user can control this VM


class VMListResponse(BaseModel):
    """List of VMs response"""
    vms: List[VMResponse]
    total: int


class VMActionRequest(BaseModel):
    """VM action request"""
    action: str = Field(..., pattern="^(start|stop|shutdown|reboot)$")


class VMActionResponse(BaseModel):
    """VM action response"""
    success: bool
    message: str
    vm_id: int
    vm_name: str
    status: Optional[str] = None


# ============= VM Assignment Schemas =============

class VMAssignmentCreate(BaseModel):
    """Create VM assignment"""
    user_id: str
    vm_id: int


class VMAssignmentResponse(BaseModel):
    """VM assignment response"""
    id: int
    user_id: str
    vm_id: int
    vm_name: Optional[str]
    created_at: datetime
    user: UserResponse
    
    class Config:
        from_attributes = True


# ============= Admin Schemas =============

class AdminStatsResponse(BaseModel):
    """Admin statistics response"""
    total_users: int
    total_vms: int
    vms_running: int
    vms_stopped: int
    recent_actions: List[dict]


# ============= Health Check =============

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    database: str
    proxmox: str
    gotrue: str
    timestamp: datetime
