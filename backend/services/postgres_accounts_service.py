"""
PostgreSQL Accounts Service - Manage tenant account IDs without SQLAlchemy.
"""
from typing import Optional, Dict, List, Any
from datetime import datetime
from database.postgres_db import postgres_db

class PostgresAccountsService:
    """Account ID operations using direct PostgreSQL queries."""

    @staticmethod
    def _ensure_accounts_table() -> None:
        """Create accounts table and unique index if not exists (idempotent)."""
        try:
            with postgres_db.get_cursor() as cursor:
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS public.accounts (
                        id BIGSERIAL PRIMARY KEY,
                        account_id VARCHAR(100) UNIQUE NOT NULL,
                        display_name VARCHAR(200),
                        is_master BOOLEAN DEFAULT FALSE,
                        is_active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ
                    )
                    """
                )
                cursor.execute(
                    """
                    CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_account_id
                    ON public.accounts(account_id)
                    """
                )
        except Exception as e:
            print(f"Error ensuring accounts table: {e}")

    @staticmethod
    def ensure_seed_accounts() -> None:
        """Insert default accounts if table is empty. Includes MasterAccount as master."""
        try:
            PostgresAccountsService._ensure_accounts_table()
            row = postgres_db.execute_single("SELECT COUNT(*) AS cnt FROM public.accounts")
            count = int(row.get("cnt", 0)) if row else 0
            if count > 0:
                return
            defaults = [
                {"account_id": "MasterAccount", "display_name": "Master Account", "is_master": True},
                {"account_id": "TestAccount", "display_name": "Test Account", "is_master": False},
                {"account_id": "AccountA", "display_name": "Account A", "is_master": False},
                {"account_id": "AccountB", "display_name": "Account B", "is_master": False},
                {"account_id": "AccountC", "display_name": "Account C", "is_master": False},
                {"account_id": "DemoAccount", "display_name": "Demo Account", "is_master": False},
            ]
            with postgres_db.get_cursor() as cursor:
                for acc in defaults:
                    cursor.execute(
                        """
                        INSERT INTO public.accounts (account_id, display_name, is_master, is_active, created_at)
                        VALUES (%s, %s, %s, TRUE, %s)
                        ON CONFLICT (account_id) DO NOTHING
                        """,
                        (acc["account_id"], acc.get("display_name"), acc.get("is_master", False), datetime.now())
                    )
        except Exception as e:
            print(f"Error seeding accounts: {e}")

    @staticmethod
    def get_by_account_id(account_id: str) -> Optional[Dict[str, Any]]:
        """Get account by account_id (case-insensitive lookup)."""
        try:
            PostgresAccountsService._ensure_accounts_table()
            return postgres_db.execute_single(
                """
                SELECT id, account_id, display_name, is_master, is_active, created_at
                FROM public.accounts
                WHERE LOWER(account_id) = LOWER(%s)
                """,
                (account_id,)
            )
        except Exception as e:
            print(f"Error getting account: {e}")
            return None

    @staticmethod
    def list_public() -> List[Dict[str, Any]]:
        try:
            PostgresAccountsService._ensure_accounts_table()
            PostgresAccountsService.ensure_seed_accounts()
            rows = postgres_db.execute_query(
                """
                SELECT account_id, display_name, is_master
                FROM public.accounts
                WHERE COALESCE(is_active, TRUE) = TRUE
                ORDER BY is_master DESC, account_id ASC
                """
            )
            return rows or []
        except Exception as e:
            print(f"Error listing public accounts: {e}")
            return []

    @staticmethod
    def list_all() -> List[Dict[str, Any]]:
        try:
            PostgresAccountsService._ensure_accounts_table()
            rows = postgres_db.execute_query(
                """
                SELECT id, account_id, display_name, is_master, is_active, created_at
                FROM public.accounts
                ORDER BY is_master DESC, account_id ASC
                """
            )
            return rows or []
        except Exception as e:
            print(f"Error listing accounts: {e}")
            return []

    @staticmethod
    def create_account(account_id: str, display_name: Optional[str] = None, is_master: bool = False) -> Optional[Dict[str, Any]]:
        try:
            PostgresAccountsService._ensure_accounts_table()
            # Ensure only one master; if a master exists, force is_master False
            existing_master = postgres_db.execute_single("SELECT 1 FROM public.accounts WHERE is_master = TRUE LIMIT 1")
            if existing_master and is_master:
                is_master = False
            result = postgres_db.execute_single(
                """
                INSERT INTO public.accounts (account_id, display_name, is_master, is_active, created_at)
                VALUES (%s, %s, %s, TRUE, %s)
                RETURNING id, account_id, display_name, is_master, is_active, created_at
                """,
                (account_id, display_name, is_master, datetime.now())
            )
            return result
        except Exception as e:
            print(f"Error creating account: {e}")
            return None

    @staticmethod
    def is_master_account(account_id: str) -> bool:
        try:
            acc = PostgresAccountsService.get_by_account_id(account_id)
            return bool(acc and acc.get("is_master"))
        except Exception:
            return False

    @staticmethod
    def update_account(account_id: str, display_name: Optional[str] = None, is_active: Optional[bool] = None) -> Optional[Dict[str, Any]]:
        """Update an account's display_name and/or is_active status."""
        try:
            PostgresAccountsService._ensure_accounts_table()
            # Build dynamic update
            updates = []
            params = []
            if display_name is not None:
                updates.append("display_name = %s")
                params.append(display_name)
            if is_active is not None:
                updates.append("is_active = %s")
                params.append(is_active)
            if not updates:
                return PostgresAccountsService.get_by_account_id(account_id)
            updates.append("updated_at = %s")
            params.append(datetime.now())
            params.append(account_id)
            query = f"""
                UPDATE public.accounts
                SET {', '.join(updates)}
                WHERE LOWER(account_id) = LOWER(%s)
                RETURNING id, account_id, display_name, is_master, is_active, created_at, updated_at
            """
            return postgres_db.execute_single(query, tuple(params))
        except Exception as e:
            print(f"Error updating account: {e}")
            return None

    @staticmethod
    def delete_account(account_id: str) -> bool:
        """Delete an account by account_id. Returns True if deleted."""
        try:
            PostgresAccountsService._ensure_accounts_table()
            with postgres_db.get_cursor() as cursor:
                cursor.execute(
                    "DELETE FROM public.accounts WHERE LOWER(account_id) = LOWER(%s)",
                    (account_id,)
                )
                return cursor.rowcount > 0
        except Exception as e:
            print(f"Error deleting account: {e}")
            return False
