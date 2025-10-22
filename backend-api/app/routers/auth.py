"""
Authentication routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.schemas import UserLogin, UserResponse, TokenResponse
from app.auth import gotrue_client
from app.models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Login endpoint
    
    Authenticates user via GoTrue and returns access token
    """
    # Authenticate with GoTrue
    auth_response = await gotrue_client.login(
        credentials.email,
        credentials.password
    )
    
    # Get or create user in local database
    user_id = auth_response.get("user", {}).get("id")
    user_email = auth_response.get("user", {}).get("email")
    
    if not user_id or not user_email:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid authentication response"
        )
    
    # Check if user exists in database
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # Create user in local database
        user = User(
            id=user_id,
            email=user_email,
            is_admin=False
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    # Return token response
    return TokenResponse(
        access_token=auth_response["access_token"],
        token_type="bearer",
        expires_in=auth_response.get("expires_in", 3600),
        user=UserResponse(
            id=user.id,
            email=user.email,
            is_admin=user.is_admin,
            created_at=user.created_at
        )
    )


@router.post("/refresh")
async def refresh_token(refresh_token: str):
    """
    Refresh access token
    """
    return await gotrue_client.refresh_token(refresh_token)


@router.post("/request-password-reset")
async def request_password_reset(email: str):
    """
    Request password reset email
    """
    return await gotrue_client.request_password_reset(email)


@router.post("/change-password")
async def change_password(
    new_password: str,
    access_token: str
):
    """
    Change user password
    """
    return await gotrue_client.change_password(access_token, new_password)
