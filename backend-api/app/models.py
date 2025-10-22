"""
SQLAlchemy database models
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    """User model - synced with GoTrue users"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)  # GoTrue user ID
    email = Column(String, unique=True, nullable=False, index=True)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    vm_assignments = relationship("VMAssignment", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User {self.email}>"


class VMAssignment(Base):
    """VM Assignment model - maps users to their workstation VMs"""
    __tablename__ = "vm_assignments"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    vm_id = Column(Integer, nullable=False)  # Proxmox VM ID
    vm_name = Column(String, nullable=True)  # Cached VM name from Proxmox
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="vm_assignments")
    
    # Constraints - one user can only be assigned to one VM
    __table_args__ = (
        UniqueConstraint('user_id', name='unique_user_vm_assignment'),
    )
    
    def __repr__(self):
        return f"<VMAssignment user_id={self.user_id} vm_id={self.vm_id}>"


class AuditLog(Base):
    """Audit log for tracking VM operations"""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_email = Column(String, nullable=False)
    action = Column(String, nullable=False)  # start, stop, status_check
    vm_id = Column(Integer, nullable=False)
    vm_name = Column(String, nullable=True)
    success = Column(Boolean, nullable=False)
    error_message = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<AuditLog {self.user_email} {self.action} VM:{self.vm_id}>"
