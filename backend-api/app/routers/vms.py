"""
VM management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import logging

from app.database import get_db
from app.schemas import VMResponse, VMListResponse, VMActionResponse
from app.auth import get_current_user
from app.models import User, VMAssignment, AuditLog
from app.proxmox import proxmox_client

router = APIRouter(prefix="/vms", tags=["Virtual Machines"])
logger = logging.getLogger(__name__)


@router.get("/", response_model=VMListResponse)
async def list_vms(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List VMs accessible to current user
    
    - Regular users: Only their assigned VM
    - Admins: All VMs in the cluster
    """
    try:
        # Get all VMs from Proxmox
        all_vms = await proxmox_client.get_all_vms()
        
        if current_user.is_admin:
            # Admin sees all VMs
            # Get assignments to show which user owns which VM
            result = await db.execute(select(VMAssignment))
            assignments = result.scalars().all()
            
            assignment_map = {a.vm_id: a for a in assignments}
            
            vm_responses = []
            for vm in all_vms:
                assignment = assignment_map.get(vm["vm_id"])
                assigned_user_email = None
                
                if assignment:
                    user_result = await db.execute(
                        select(User).where(User.id == assignment.user_id)
                    )
                    assigned_user = user_result.scalar_one_or_none()
                    if assigned_user:
                        assigned_user_email = assigned_user.email
                
                vm_responses.append(VMResponse(
                    vm_id=vm["vm_id"],
                    vm_name=vm["vm_name"],
                    status=vm["status"],
                    uptime=vm.get("uptime"),
                    assigned_user=assigned_user_email,
                    can_control=True
                ))
            
            return VMListResponse(vms=vm_responses, total=len(vm_responses))
        
        else:
            # Regular user sees only their assigned VM
            result = await db.execute(
                select(VMAssignment).where(VMAssignment.user_id == current_user.id)
            )
            assignment = result.scalar_one_or_none()
            
            if not assignment:
                return VMListResponse(vms=[], total=0)
            
            # Find the user's VM in the list
            user_vm = next((vm for vm in all_vms if vm["vm_id"] == assignment.vm_id), None)
            
            if not user_vm:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Assigned VM {assignment.vm_id} not found in Proxmox"
                )
            
            vm_response = VMResponse(
                vm_id=user_vm["vm_id"],
                vm_name=user_vm["vm_name"],
                status=user_vm["status"],
                uptime=user_vm.get("uptime"),
                assigned_user=current_user.email,
                can_control=True
            )
            
            return VMListResponse(vms=[vm_response], total=1)
    
    except Exception as e:
        logger.error(f"Error listing VMs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch VMs: {str(e)}"
        )


@router.get("/{vm_id}/status", response_model=VMResponse)
async def get_vm_status(
    vm_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get status of a specific VM
    
    Users can only query their assigned VM unless they are admin
    """
    # Check permissions
    if not current_user.is_admin:
        result = await db.execute(
            select(VMAssignment).where(
                VMAssignment.user_id == current_user.id,
                VMAssignment.vm_id == vm_id
            )
        )
        assignment = result.scalar_one_or_none()
        
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this VM"
            )
    
    try:
        vm_status = await proxmox_client.get_vm_status(vm_id)
        
        return VMResponse(
            vm_id=vm_status["vm_id"],
            vm_name=vm_status["vm_name"],
            status=vm_status["status"],
            uptime=vm_status.get("uptime"),
            assigned_user=current_user.email if not current_user.is_admin else None,
            can_control=True
        )
    
    except Exception as e:
        logger.error(f"Error getting VM {vm_id} status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get VM status: {str(e)}"
        )


@router.post("/{vm_id}/start", response_model=VMActionResponse)
async def start_vm(
    vm_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Start a VM
    
    Users can only start their assigned VM unless they are admin
    """
    # Check permissions
    if not current_user.is_admin:
        result = await db.execute(
            select(VMAssignment).where(
                VMAssignment.user_id == current_user.id,
                VMAssignment.vm_id == vm_id
            )
        )
        assignment = result.scalar_one_or_none()
        
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this VM"
            )
    
    try:
        result = await proxmox_client.start_vm(vm_id)
        
        # Log the action
        audit_log = AuditLog(
            user_id=current_user.id,
            user_email=current_user.email,
            action="start",
            vm_id=vm_id,
            vm_name=result["vm_name"],
            success=result["success"],
            error_message=None if result["success"] else result.get("message"),
            ip_address=request.client.host if request.client else None
        )
        db.add(audit_log)
        await db.commit()
        
        return VMActionResponse(**result)
    
    except Exception as e:
        logger.error(f"Error starting VM {vm_id}: {e}")
        
        # Log failed action
        audit_log = AuditLog(
            user_id=current_user.id,
            user_email=current_user.email,
            action="start",
            vm_id=vm_id,
            vm_name=f"VM-{vm_id}",
            success=False,
            error_message=str(e),
            ip_address=request.client.host if request.client else None
        )
        db.add(audit_log)
        await db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start VM: {str(e)}"
        )
