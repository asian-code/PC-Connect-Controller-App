"""
Proxmox API client for VM management
"""
from proxmoxer import ProxmoxAPI
from typing import List, Dict, Optional
import logging
from app.config import settings

logger = logging.getLogger(__name__)


class ProxmoxClient:
    """Proxmox API client wrapper"""
    
    def __init__(self):
        """Initialize Proxmox client"""
        try:
            self.client = ProxmoxAPI(
                settings.proxmox_host,
                port=settings.proxmox_port,
                user=settings.proxmox_user,
                token_name=settings.proxmox_token_name,
                token_value=settings.proxmox_token_value,
                verify_ssl=settings.proxmox_verify_ssl,
            )
            self.node = settings.proxmox_node
            logger.info(f"Proxmox client initialized for node: {self.node}")
        except Exception as e:
            logger.error(f"Failed to initialize Proxmox client: {e}")
            raise
    
    async def get_vm_status(self, vm_id: int) -> Dict:
        """
        Get VM status and information
        
        Args:
            vm_id: Proxmox VM ID
            
        Returns:
            Dict with VM status information
        """
        try:
            # Get VM configuration
            vm_config = self.client.nodes(self.node).qemu(vm_id).status.current.get()
            
            return {
                "vm_id": vm_id,
                "vm_name": vm_config.get("name", f"VM-{vm_id}"),
                "status": vm_config.get("status", "unknown"),
                "uptime": vm_config.get("uptime", 0),
                "cpu": vm_config.get("cpu", 0),
                "memory": vm_config.get("mem", 0),
                "maxmem": vm_config.get("maxmem", 0),
            }
        except Exception as e:
            logger.error(f"Error getting VM {vm_id} status: {e}")
            raise Exception(f"Failed to get VM status: {str(e)}")
    
    async def get_all_vms(self, vm_ids: Optional[List[int]] = None) -> List[Dict]:
        """
        Get status for multiple VMs
        
        Args:
            vm_ids: List of VM IDs to query (default: [106, 103, 101, 102])
            
        Returns:
            List of VM status dictionaries
        """
        if vm_ids is None:
            vm_ids = [106, 103, 101, 102]
        
        vms = []
        for vm_id in vm_ids:
            try:
                vm_status = await self.get_vm_status(vm_id)
                vms.append(vm_status)
            except Exception as e:
                logger.warning(f"Could not get status for VM {vm_id}: {e}")
                # Add VM with unknown status
                vms.append({
                    "vm_id": vm_id,
                    "vm_name": f"VM-{vm_id}",
                    "status": "unknown",
                    "error": str(e)
                })
        
        return vms
    
    async def start_vm(self, vm_id: int) -> Dict:
        """
        Start a VM
        
        Args:
            vm_id: Proxmox VM ID
            
        Returns:
            Dict with operation result
        """
        try:
            # Check current status first
            current_status = await self.get_vm_status(vm_id)
            
            if current_status["status"] == "running":
                return {
                    "success": False,
                    "message": "VM is already running",
                    "vm_id": vm_id,
                    "vm_name": current_status["vm_name"],
                    "status": "running",
                }
            
            # Start the VM
            self.client.nodes(self.node).qemu(vm_id).status.start.post()
            
            logger.info(f"Successfully started VM {vm_id}")
            
            return {
                "success": True,
                "message": "VM start command sent successfully",
                "vm_id": vm_id,
                "vm_name": current_status["vm_name"],
                "status": "starting",
            }
            
        except Exception as e:
            logger.error(f"Error starting VM {vm_id}: {e}")
            raise Exception(f"Failed to start VM: {str(e)}")
    
    async def stop_vm(self, vm_id: int) -> Dict:
        """
        Stop a VM (force stop)
        
        Args:
            vm_id: Proxmox VM ID
            
        Returns:
            Dict with operation result
        """
        try:
            current_status = await self.get_vm_status(vm_id)
            
            if current_status["status"] == "stopped":
                return {
                    "success": False,
                    "message": "VM is already stopped",
                    "vm_id": vm_id,
                    "vm_name": current_status["vm_name"],
                    "status": "stopped",
                }
            
            # Stop the VM
            self.client.nodes(self.node).qemu(vm_id).status.stop.post()
            
            logger.info(f"Successfully stopped VM {vm_id}")
            
            return {
                "success": True,
                "message": "VM stop command sent successfully",
                "vm_id": vm_id,
                "vm_name": current_status["vm_name"],
                "status": "stopping",
            }
            
        except Exception as e:
            logger.error(f"Error stopping VM {vm_id}: {e}")
            raise Exception(f"Failed to stop VM: {str(e)}")
    
    async def shutdown_vm(self, vm_id: int) -> Dict:
        """
        Gracefully shutdown a VM
        
        Args:
            vm_id: Proxmox VM ID
            
        Returns:
            Dict with operation result
        """
        try:
            current_status = await self.get_vm_status(vm_id)
            
            if current_status["status"] == "stopped":
                return {
                    "success": False,
                    "message": "VM is already stopped",
                    "vm_id": vm_id,
                    "vm_name": current_status["vm_name"],
                    "status": "stopped",
                }
            
            # Shutdown the VM
            self.client.nodes(self.node).qemu(vm_id).status.shutdown.post()
            
            logger.info(f"Successfully sent shutdown command to VM {vm_id}")
            
            return {
                "success": True,
                "message": "VM shutdown command sent successfully",
                "vm_id": vm_id,
                "vm_name": current_status["vm_name"],
                "status": "shutting_down",
            }
            
        except Exception as e:
            logger.error(f"Error shutting down VM {vm_id}: {e}")
            raise Exception(f"Failed to shutdown VM: {str(e)}")
    
    async def health_check(self) -> bool:
        """
        Check if Proxmox API is accessible
        
        Returns:
            True if accessible, False otherwise
        """
        try:
            self.client.version.get()
            return True
        except Exception as e:
            logger.error(f"Proxmox health check failed: {e}")
            return False


# Global Proxmox client instance
proxmox_client = ProxmoxClient()
