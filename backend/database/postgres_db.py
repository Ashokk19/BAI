"""
Direct PostgreSQL database connection and operations.
No SQLAlchemy - pure psycopg2 using existing BAI database settings.
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool
from typing import Optional, Dict, List, Any
from contextlib import contextmanager
from config.settings import settings

class PostgresDB:
    """Direct PostgreSQL database operations using existing BAI settings."""
    
    def __init__(self):
        self.connection_pool = None
        self._init_connection_pool()
    
    def _init_connection_pool(self):
        """Initialize connection pool using BAI settings."""
        try:
            self.connection_pool = SimpleConnectionPool(
                1, 20,  # min and max connections
                host=settings.DATABASE_HOST,
                database=settings.DATABASE_NAME,
                user=settings.DATABASE_USER,
                password=settings.DATABASE_PASSWORD,
                port=settings.DATABASE_PORT
            )
            print(f"✅ PostgreSQL connection pool initialized for {settings.DATABASE_NAME}")
        except Exception as e:
            print(f"❌ Failed to initialize PostgreSQL connection pool: {e}")
            raise
    
    @contextmanager
    def get_connection(self):
        """Get a connection from the pool."""
        conn = None
        try:
            conn = self.connection_pool.getconn()
            yield conn
        finally:
            if conn:
                self.connection_pool.putconn(conn)
    
    @contextmanager
    def get_cursor(self, commit=True):
        """Get a cursor with automatic connection management."""
        with self.get_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            try:
                yield cursor
                if commit:
                    conn.commit()
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                cursor.close()
    
    def get_db_connection(self):
        """Get database connection for FastAPI dependency injection."""
        return self.get_connection()
    
    def execute_query(self, query: str, params: tuple = None) -> List[Dict]:
        """Execute a SELECT query and return results."""
        with self.get_cursor(commit=False) as cursor:
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
    
    def execute_single(self, query: str, params: tuple = None) -> Optional[Dict]:
        """Execute a SELECT query and return single result."""
        with self.get_cursor(commit=True) as cursor:  # Enable commit for INSERT queries
            cursor.execute(query, params)
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def execute_insert(self, query: str, params: tuple = None) -> Optional[int]:
        """Execute an INSERT query and return the ID."""
        with self.get_cursor() as cursor:
            cursor.execute(query, params)
            if cursor.description:
                result = cursor.fetchone()
                return result[0] if result else None
            return cursor.rowcount
    
    def execute_update(self, query: str, params: tuple = None) -> int:
        """Execute an UPDATE/DELETE query and return affected rows."""
        with self.get_cursor() as cursor:
            cursor.execute(query, params)
            return cursor.rowcount
    
    def execute_transaction(self, operations: List[Dict]) -> bool:
        """Execute multiple operations in a transaction."""
        with self.get_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            try:
                for op in operations:
                    cursor.execute(op['query'], op.get('params'))
                conn.commit()
                return True
            except Exception as e:
                conn.rollback()
                print(f"Transaction failed: {e}")
                return False
            finally:
                cursor.close()

# Global database instance
postgres_db = PostgresDB()
