"""
BAI Backend Authentication Service

This module contains the authentication service with JWT token handling,
password hashing, and user verification.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from models.user import User
from config.settings import settings

class AuthService:
    """Authentication service for handling user authentication and JWT tokens."""
    
    def __init__(self):
        """Initialize the authentication service."""
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.secret_key = settings.SECRET_KEY
        self.algorithm = settings.ALGORITHM
        self.access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verify a plain password against a hashed password.
        
        Args:
            plain_password: The plain text password
            hashed_password: The hashed password from database
            
        Returns:
            True if password matches, False otherwise
        """
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """
        Get hash of a password.
        
        Args:
            password: The plain text password
            
        Returns:
            The hashed password
        """
        return self.pwd_context.hash(password)
    
    def authenticate_user(self, db: Session, identifier: str, password: str) -> Optional[User]:
        """
        Authenticate a user with username/email and password.
        
        Args:
            db: Database session
            identifier: User's username or email
            password: User's password
            
        Returns:
            User object if authentication successful, None otherwise
        """
        # Try to find user by email first, then by username
        user = db.query(User).filter(
            (User.email == identifier) | (User.username == identifier)
        ).first()
        
        if not user:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        return user
    
    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """
        Create a JWT access token.
        
        Args:
            data: Data to encode in the token
            expires_delta: Token expiration time
            
        Returns:
            JWT token string
        """
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify and decode a JWT token.
        
        Args:
            token: JWT token string
            
        Returns:
            Decoded token data if valid, None otherwise
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except JWTError:
            return None
    
    def get_current_user(self, db: Session, token: str) -> Optional[User]:
        """
        Get current user from JWT token.
        
        Args:
            db: Database session
            token: JWT token string
            
        Returns:
            User object if token is valid, None otherwise
        """
        payload = self.verify_token(token)
        if payload is None:
            return None
        
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user
    
    def create_user(self, db: Session, user_data: Dict[str, Any]) -> User:
        """
        Create a new user.
        
        Args:
            db: Database session
            user_data: User data dictionary
            
        Returns:
            Created user object
        """
        hashed_password = self.get_password_hash(user_data["password"])
        
        user = User(
            email=user_data["email"],
            username=user_data["username"],
            hashed_password=hashed_password,
            first_name=user_data["first_name"],
            last_name=user_data["last_name"],
            phone=user_data.get("phone"),
            address=user_data.get("address"),
            is_admin=user_data.get("is_admin", False)
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    def update_last_login(self, db: Session, user: User) -> None:
        """
        Update user's last login timestamp.
        
        Args:
            db: Database session
            user: User object
        """
        user.last_login = datetime.utcnow()
        db.commit()

# Create global auth service instance
auth_service = AuthService() 