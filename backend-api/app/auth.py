"""
GoTrue authentication integration
"""
import httpx
import jwt
from typing import Optional, Dict
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from app.config import settings
from app.database import get_db
from app.models import User

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer()


class GoTrueClient:
    """GoTrue client for authentication operations"""
    
    def __init__(self):
        self.base_url = settings.gotrue_url
        self.jwt_secret = settings.gotrue_jwt_secret
    
    async def login(self, email: str, password: str) -> Dict:
        """
        Login user via GoTrue
        
        Args:
            email: User email
            password: User password
            
        Returns:
            Dict with access_token and user info
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/token?grant_type=password",
                    json={"email": email, "password": password}
                )
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid credentials"
                    )
                
                return response.json()
                
            except httpx.RequestError as e:
                logger.error(f"GoTrue login request failed: {e}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Authentication service unavailable"
                )
    
    async def signup(self, email: str, password: str) -> Dict:
        """
        Register new user via GoTrue
        
        Args:
            email: User email
            password: User password
            
        Returns:
            Dict with user info
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/signup",
                    json={
                        "email": email,
                        "password": password,
                        "data": {}  # Custom metadata
                    }
                )
                
                if response.status_code not in [200, 201]:
                    error_msg = response.json().get("msg", "Signup failed")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=error_msg
                    )
                
                return response.json()
                
            except httpx.RequestError as e:
                logger.error(f"GoTrue signup request failed: {e}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Authentication service unavailable"
                )
    
    async def verify_token(self, token: str) -> Dict:
        """
        Verify JWT token from GoTrue
        
        Args:
            token: JWT access token
            
        Returns:
            Decoded token payload
        """
        try:
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=["HS256"],
                options={"verify_exp": True}
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    
    async def refresh_token(self, refresh_token: str) -> Dict:
        """
        Refresh access token
        
        Args:
            refresh_token: Refresh token
            
        Returns:
            New access token and refresh token
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/token?grant_type=refresh_token",
                    json={"refresh_token": refresh_token}
                )
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid refresh token"
                    )
                
                return response.json()
                
            except httpx.RequestError as e:
                logger.error(f"GoTrue refresh token request failed: {e}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Authentication service unavailable"
                )
    
    async def change_password(self, access_token: str, new_password: str) -> Dict:
        """
        Change user password
        
        Args:
            access_token: User's access token
            new_password: New password
            
        Returns:
            Success message
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.put(
                    f"{self.base_url}/user",
                    headers={"Authorization": f"Bearer {access_token}"},
                    json={"password": new_password}
                )
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Password change failed"
                    )
                
                return response.json()
                
            except httpx.RequestError as e:
                logger.error(f"GoTrue password change failed: {e}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Authentication service unavailable"
                )
    
    async def request_password_reset(self, email: str) -> Dict:
        """
        Request password reset email
        
        Args:
            email: User email
            
        Returns:
            Success message
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/recover",
                    json={"email": email}
                )
                
                # GoTrue returns 200 even if email doesn't exist (security)
                return {"message": "Password reset email sent if account exists"}
                
            except httpx.RequestError as e:
                logger.error(f"GoTrue password reset request failed: {e}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Authentication service unavailable"
                )
    
    async def health_check(self) -> bool:
        """
        Check if GoTrue is accessible
        
        Returns:
            True if accessible, False otherwise
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{self.base_url}/health")
                return response.status_code == 200
            except Exception as e:
                logger.error(f"GoTrue health check failed: {e}")
                return False


# Global GoTrue client
gotrue_client = GoTrueClient()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency to get current authenticated user
    
    Args:
        credentials: HTTP Bearer token
        db: Database session
        
    Returns:
        User object
    """
    token = credentials.credentials
    
    # Verify token with GoTrue
    payload = await gotrue_client.verify_token(token)
    user_id = payload.get("sub")
    user_email = payload.get("email")
    
    if not user_id or not user_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Get user from database
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in database"
        )
    
    return user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to require admin privileges
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User object if admin
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    
    return current_user
