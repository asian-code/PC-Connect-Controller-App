"""
Admin-only routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from app.database import get_db
from app.schemas import (
    UserCreate, UserResponse, VMAssignmentCreate, 
    VMAssignmentResponse, AdminStatsResponse
)
from app.auth import get_current_admin_user, gotrue_client
from app.models import User, VMAssignment, AuditLog
from app.proxmox import proxmox_client

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new user (Admin only)
    
    Creates user in GoTrue and local database
    """
    try:
        # Create user in GoTrue
        gotrue_response = await gotrue_client.signup(
            user_data.email,
            user_data.password
        )
        
        user_id = gotrue_response.get("id") or gotrue_response.get("user", {}).get("id")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get user ID from GoTrue"
            )
        
        # Create user in local database
        new_user = User(
            id=user_id,
            email=user_data.email,
            is_admin=user_data.is_admin
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        return UserResponse(
            id=new_user.id,
            email=new_user.email,
            is_admin=new_user.is_admin,
            created_at=new_user.created_at
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all users (Admin only)
    """
    result = await db.execute(select(User))
    users = result.scalars().all()
    
    return [
        UserResponse(
            id=user.id,
            email=user.email,
            is_admin=user.is_admin,
            created_at=user.created_at
        )
        for user in users
    ]


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a user (Admin only)
    
    Note: This only deletes from local DB. GoTrue user should be deleted separately.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    await db.delete(user)
    await db.commit()
    
    return {"message": f"User {user.email} deleted successfully"}


@router.post("/vm-assignments", response_model=VMAssignmentResponse)
async def assign_vm_to_user(
    assignment_data: VMAssignmentCreate,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Assign a VM to a user (Admin only)
    """
    # Check if user exists
    user_result = await db.execute(
        select(User).where(User.id == assignment_data.user_id)
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user already has a VM assigned
    existing_result = await db.execute(
        select(VMAssignment).where(VMAssignment.user_id == assignment_data.user_id)
    )
    existing_assignment = existing_result.scalar_one_or_none()
    
    if existing_assignment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User already has VM {existing_assignment.vm_id} assigned"
        )
    
    # Verify VM exists in Proxmox
    try:
        vm_status = await proxmox_client.get_vm_status(assignment_data.vm_id)
        vm_name = vm_status["vm_name"]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"VM {assignment_data.vm_id} not found in Proxmox: {str(e)}"
        )
    
    # Create assignment
    assignment = VMAssignment(
        user_id=assignment_data.user_id,
        vm_id=assignment_data.vm_id,
        vm_name=vm_name
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    
    return VMAssignmentResponse(
        id=assignment.id,
        user_id=assignment.user_id,
        vm_id=assignment.vm_id,
        vm_name=assignment.vm_name,
        created_at=assignment.created_at,
        user=UserResponse(
            id=user.id,
            email=user.email,
            is_admin=user.is_admin,
            created_at=user.created_at
        )
    )


@router.get("/vm-assignments", response_model=List[VMAssignmentResponse])
async def list_vm_assignments(
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all VM assignments (Admin only)
    """
    result = await db.execute(
        select(VMAssignment).join(User)
    )
    assignments = result.scalars().all()
    
    response = []
    for assignment in assignments:
        user_result = await db.execute(
            select(User).where(User.id == assignment.user_id)
        )
        user = user_result.scalar_one()
        
        response.append(VMAssignmentResponse(
            id=assignment.id,
            user_id=assignment.user_id,
            vm_id=assignment.vm_id,
            vm_name=assignment.vm_name,
            created_at=assignment.created_at,
            user=UserResponse(
                id=user.id,
                email=user.email,
                is_admin=user.is_admin,
                created_at=user.created_at
            )
        ))
    
    return response


@router.delete("/vm-assignments/{assignment_id}")
async def delete_vm_assignment(
    assignment_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a VM assignment (Admin only)
    """
    result = await db.execute(
        select(VMAssignment).where(VMAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    await db.delete(assignment)
    await db.commit()
    
    return {"message": "VM assignment deleted successfully"}


@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    current_admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get admin statistics dashboard (Admin only)
    """
    # Count users
    user_count_result = await db.execute(select(func.count(User.id)))
    total_users = user_count_result.scalar()
    
    # Get VM statuses
    all_vms = await proxmox_client.get_all_vms()
    vms_running = sum(1 for vm in all_vms if vm["status"] == "running")
    vms_stopped = sum(1 for vm in all_vms if vm["status"] == "stopped")
    
    # Get recent audit logs
    recent_logs_result = await db.execute(
        select(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .limit(10)
    )
    recent_logs = recent_logs_result.scalars().all()
    
    recent_actions = [
        {
            "user_email": log.user_email,
            "action": log.action,
            "vm_id": log.vm_id,
            "vm_name": log.vm_name,
            "success": log.success,
            "timestamp": log.timestamp.isoformat()
        }
        for log in recent_logs
    ]
    
    return AdminStatsResponse(
        total_users=total_users,
        total_vms=len(all_vms),
        vms_running=vms_running,
        vms_stopped=vms_stopped,
        recent_actions=recent_actions
    )
