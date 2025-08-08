"""
BAI Backend Database Configuration

This module contains the SQLAlchemy database configuration including
engine, session, and base class setup.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config.settings import settings

# Create SQLAlchemy engine
engine = create_engine(
    settings.database_url,
    echo=settings.DEBUG,  # Log SQL queries in debug mode
    pool_pre_ping=True,   # Verify connections before use
    pool_recycle=300,     # Recycle connections every 5 minutes
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()

def get_db():
    """
    Database dependency function.
    
    This function creates a new database session for each request
    and ensures it's properly closed after use.
    
    Yields:
        Database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """
    Initialize database tables.
    
    Creates all tables defined in the models.
    """
    Base.metadata.create_all(bind=engine)

def drop_db():
    """
    Drop all database tables.
    
    Warning: This will delete all data in the database.
    """
    Base.metadata.drop_all(bind=engine) 