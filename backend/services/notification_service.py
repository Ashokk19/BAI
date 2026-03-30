from __future__ import annotations

import base64
import html
from contextlib import contextmanager
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Set

import httpx

from config.settings import settings
from database.postgres_db import get_request_user_context, postgres_db, set_request_user_context
from routers.pdf_generator import CustomerInfo, GeneratePDFRequest, InvoiceItem, OrganizationInfo, create_pdf_with_reportlab
from services.postgres_inventory_service import PostgresInventoryService


NOTIFICATION_SENDER = "support@av2solutions.in"


class NotificationService:
    _schema_ready = False

    DEFAULTS = {
        "email": False,
        "push": False,
        "sms": False,
        "invoiceAlerts": False,
        "stockAlerts": False,
        "paymentReminders": False,
        "deliveryAlerts": False,
    }

    @staticmethod
    def ensure_schema() -> None:
        if NotificationService._schema_ready:
            return

        with postgres_db.get_connection() as conn:
            cur = conn.cursor()
            try:
                cur.execute("CREATE SCHEMA IF NOT EXISTS app")
                cur.execute(
                    """
                    CREATE OR REPLACE FUNCTION app.current_account_id()
                    RETURNS text
                    LANGUAGE sql
                    STABLE
                    AS $$
                        SELECT NULLIF(
                            COALESCE(
                                current_setting('request.jwt.claim.account_id', true),
                                current_setting('app.current_account_id', true)
                            ),
                            ''
                        );
                    $$
                    """
                )
                cur.execute(
                    """
                    CREATE OR REPLACE FUNCTION app.current_user_id()
                    RETURNS bigint
                    LANGUAGE plpgsql
                    STABLE
                    AS $$
                    DECLARE
                        value_text text;
                    BEGIN
                        value_text := COALESCE(
                            current_setting('request.jwt.claim.user_id', true),
                            current_setting('app.current_user_id', true)
                        );

                        IF value_text IS NULL OR value_text = '' THEN
                            RETURN NULL;
                        END IF;

                        RETURN value_text::bigint;
                    EXCEPTION
                        WHEN invalid_text_representation THEN
                            RETURN NULL;
                    END;
                    $$
                    """
                )
                cur.execute(
                    """
                    CREATE OR REPLACE FUNCTION app.current_is_admin()
                    RETURNS boolean
                    LANGUAGE plpgsql
                    STABLE
                    AS $$
                    DECLARE
                        value_text text;
                    BEGIN
                        value_text := COALESCE(
                            current_setting('request.jwt.claim.is_admin', true),
                            current_setting('app.current_is_admin', true)
                        );

                        IF value_text IS NULL OR value_text = '' THEN
                            RETURN FALSE;
                        END IF;

                        RETURN value_text::boolean;
                    EXCEPTION
                        WHEN invalid_text_representation THEN
                            RETURN FALSE;
                    END;
                    $$
                    """
                )
                cur.execute(
                    """
                    CREATE OR REPLACE FUNCTION app.current_is_master()
                    RETURNS boolean
                    LANGUAGE plpgsql
                    STABLE
                    AS $$
                    DECLARE
                        value_text text;
                    BEGIN
                        value_text := COALESCE(
                            current_setting('request.jwt.claim.is_master', true),
                            current_setting('app.current_is_master', true)
                        );

                        IF value_text IS NULL OR value_text = '' THEN
                            RETURN FALSE;
                        END IF;

                        RETURN value_text::boolean;
                    EXCEPTION
                        WHEN invalid_text_representation THEN
                            RETURN FALSE;
                    END;
                    $$
                    """
                )
                cur.execute(
                    """
                    CREATE OR REPLACE FUNCTION app.same_account(target_account_id text)
                    RETURNS boolean
                    LANGUAGE sql
                    STABLE
                    AS $$
                        SELECT app.current_is_master() OR app.current_account_id() = target_account_id;
                    $$
                    """
                )
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS public.notification_preferences (
                        id BIGSERIAL PRIMARY KEY,
                        account_id TEXT NOT NULL,
                        user_id BIGINT NOT NULL,
                        email BOOLEAN NOT NULL DEFAULT FALSE,
                        push BOOLEAN NOT NULL DEFAULT FALSE,
                        sms BOOLEAN NOT NULL DEFAULT FALSE,
                        invoice_alerts BOOLEAN NOT NULL DEFAULT FALSE,
                        stock_alerts BOOLEAN NOT NULL DEFAULT FALSE,
                        payment_reminders BOOLEAN NOT NULL DEFAULT FALSE,
                        delivery_alerts BOOLEAN NOT NULL DEFAULT FALSE,
                        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                        UNIQUE (account_id, user_id)
                    )
                """)
                cur.execute("CREATE INDEX IF NOT EXISTS idx_notification_preferences_account_user ON public.notification_preferences (account_id, user_id)")
                cur.execute("ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS payment_reminders BOOLEAN NOT NULL DEFAULT FALSE")
                cur.execute("ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS delivery_alerts BOOLEAN NOT NULL DEFAULT FALSE")
                cur.execute("ALTER TABLE public.notification_preferences ALTER COLUMN email SET DEFAULT FALSE")
                cur.execute("ALTER TABLE public.notification_preferences ALTER COLUMN push SET DEFAULT FALSE")
                cur.execute("ALTER TABLE public.notification_preferences ALTER COLUMN sms SET DEFAULT FALSE")
                cur.execute("ALTER TABLE public.notification_preferences ALTER COLUMN invoice_alerts SET DEFAULT FALSE")
                cur.execute("ALTER TABLE public.notification_preferences ALTER COLUMN stock_alerts SET DEFAULT FALSE")
                cur.execute("ALTER TABLE public.notification_preferences ALTER COLUMN payment_reminders SET DEFAULT FALSE")
                cur.execute("ALTER TABLE public.notification_preferences ALTER COLUMN delivery_alerts SET DEFAULT FALSE")
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS public.notification_delivery_log (
                        id BIGSERIAL PRIMARY KEY,
                        account_id TEXT NOT NULL,
                        recipient_email TEXT NOT NULL,
                        alert_type TEXT NOT NULL,
                        fingerprint TEXT NOT NULL,
                        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                        UNIQUE (account_id, recipient_email, alert_type, fingerprint)
                    )
                """)
                cur.execute("CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_account_type ON public.notification_delivery_log (account_id, alert_type, created_at DESC)")
                cur.execute("ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY")
                cur.execute("ALTER TABLE public.notification_preferences FORCE ROW LEVEL SECURITY")
                cur.execute("ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY")
                cur.execute("ALTER TABLE public.notification_delivery_log FORCE ROW LEVEL SECURITY")
                cur.execute("DROP POLICY IF EXISTS app_select_notification_preferences ON public.notification_preferences")
                cur.execute("DROP POLICY IF EXISTS app_insert_notification_preferences ON public.notification_preferences")
                cur.execute("DROP POLICY IF EXISTS app_update_notification_preferences ON public.notification_preferences")
                cur.execute("DROP POLICY IF EXISTS app_delete_notification_preferences ON public.notification_preferences")
                cur.execute(
                    """
                    CREATE POLICY app_select_notification_preferences
                    ON public.notification_preferences
                    FOR SELECT
                    USING (
                        app.current_is_master()
                        OR (
                            account_id = app.current_account_id()
                            AND (
                                app.current_is_admin()
                                OR user_id = app.current_user_id()
                            )
                        )
                    )
                    """
                )
                cur.execute(
                    """
                    CREATE POLICY app_insert_notification_preferences
                    ON public.notification_preferences
                    FOR INSERT
                    WITH CHECK (
                        app.current_is_master()
                        OR (
                            account_id = app.current_account_id()
                            AND (
                                app.current_is_admin()
                                OR user_id = app.current_user_id()
                            )
                        )
                    )
                    """
                )
                cur.execute(
                    """
                    CREATE POLICY app_update_notification_preferences
                    ON public.notification_preferences
                    FOR UPDATE
                    USING (
                        app.current_is_master()
                        OR (
                            account_id = app.current_account_id()
                            AND (
                                app.current_is_admin()
                                OR user_id = app.current_user_id()
                            )
                        )
                    )
                    WITH CHECK (
                        app.current_is_master()
                        OR (
                            account_id = app.current_account_id()
                            AND (
                                app.current_is_admin()
                                OR user_id = app.current_user_id()
                            )
                        )
                    )
                    """
                )
                cur.execute(
                    """
                    CREATE POLICY app_delete_notification_preferences
                    ON public.notification_preferences
                    FOR DELETE
                    USING (
                        app.current_is_master()
                        OR (
                            account_id = app.current_account_id()
                            AND (
                                app.current_is_admin()
                                OR user_id = app.current_user_id()
                            )
                        )
                    )
                    """
                )
                cur.execute("DROP POLICY IF EXISTS app_select_notification_delivery_log ON public.notification_delivery_log")
                cur.execute("DROP POLICY IF EXISTS app_insert_notification_delivery_log ON public.notification_delivery_log")
                cur.execute("DROP POLICY IF EXISTS app_update_notification_delivery_log ON public.notification_delivery_log")
                cur.execute("DROP POLICY IF EXISTS app_delete_notification_delivery_log ON public.notification_delivery_log")
                cur.execute(
                    """
                    CREATE POLICY app_select_notification_delivery_log
                    ON public.notification_delivery_log
                    FOR SELECT
                    USING (app.same_account(account_id))
                    """
                )
                cur.execute(
                    """
                    CREATE POLICY app_insert_notification_delivery_log
                    ON public.notification_delivery_log
                    FOR INSERT
                    WITH CHECK (app.same_account(account_id))
                    """
                )
                cur.execute(
                    """
                    CREATE POLICY app_update_notification_delivery_log
                    ON public.notification_delivery_log
                    FOR UPDATE
                    USING (app.same_account(account_id))
                    WITH CHECK (app.same_account(account_id))
                    """
                )
                cur.execute(
                    """
                    CREATE POLICY app_delete_notification_delivery_log
                    ON public.notification_delivery_log
                    FOR DELETE
                    USING (app.same_account(account_id))
                    """
                )
                conn.commit()
                NotificationService._schema_ready = True
            finally:
                cur.close()

    @classmethod
    def get_preferences(cls, user_id: int, account_id: str) -> Dict[str, bool]:
        cls.ensure_schema()
        row = postgres_db.execute_single(
            "SELECT email,push,sms,invoice_alerts,stock_alerts,payment_reminders,delivery_alerts FROM public.notification_preferences WHERE account_id=%s AND user_id=%s",
            (account_id, user_id),
        )
        return cls._row_to_prefs(row)

    @classmethod
    def update_preferences(cls, user_id: int, account_id: str, prefs: Dict[str, Any]) -> Dict[str, bool]:
        cls.ensure_schema()
        merged = cls._normalize(prefs)
        row = postgres_db.execute_single(
            """
            INSERT INTO public.notification_preferences (
                account_id,user_id,email,push,sms,invoice_alerts,stock_alerts,payment_reminders,delivery_alerts,created_at,updated_at
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW())
            ON CONFLICT (account_id,user_id)
            DO UPDATE SET
                email=EXCLUDED.email,
                push=EXCLUDED.push,
                sms=EXCLUDED.sms,
                invoice_alerts=EXCLUDED.invoice_alerts,
                stock_alerts=EXCLUDED.stock_alerts,
                payment_reminders=EXCLUDED.payment_reminders,
                delivery_alerts=EXCLUDED.delivery_alerts,
                updated_at=NOW()
            RETURNING email,push,sms,invoice_alerts,stock_alerts,payment_reminders,delivery_alerts
            """,
            (account_id, user_id, merged["email"], merged["push"], merged["sms"], merged["invoiceAlerts"], merged["stockAlerts"], merged["paymentReminders"], merged["deliveryAlerts"]),
        )
        return cls._row_to_prefs(row)

    @classmethod
    async def invoice_created(cls, account_id: str, invoice_id: int) -> None:
        cls.ensure_schema()
        if not settings.RESEND_API_KEY:
            return
        recipients = cls._recipients(account_id, "invoiceAlerts")
        if not recipients:
            return
        data = cls._invoice_email_data(account_id, invoice_id)
        if not data:
            return
        for email in recipients:
            await cls._send_once(account_id, email, "invoice_alert", f"invoice-{invoice_id}", f"Invoice Alert: {data['invoice_number']}", cls._invoice_html(data), [{"filename": f"Invoice-{data['invoice_number']}.pdf", "content": data['pdf_base64'], "content_type": "application/pdf"}])

    @classmethod
    async def item_changed(cls, account_id: str, item_id: int) -> None:
        cls.ensure_schema()
        if not settings.RESEND_API_KEY:
            return
        with cls._master():
            item = postgres_db.execute_single("SELECT id,name,sku,item_code,current_stock,minimum_stock,expiry_date,has_expiry,shelf_life_days,created_at FROM items WHERE account_id=%s AND id=%s", (account_id, item_id))
        if not item:
            return
        recipients = cls._recipients(account_id, "stockAlerts")
        if not recipients:
            return
        current_stock = float(item.get("current_stock") or 0)
        minimum_stock = float(item.get("minimum_stock") or 0)
        if current_stock <= minimum_stock:
            body = cls._table_html("Low Stock Alert", {
                "Item": item.get("name") or "Item",
                "SKU": item.get("sku") or item.get("item_code") or "-",
                "Current Stock": f"{current_stock:g}",
                "Minimum Stock": f"{minimum_stock:g}",
            }, "An inventory item is at or below its minimum stock level.")
            for email in recipients:
                await cls._send_once(account_id, email, "stock_alert", f"low-stock-{item_id}-{current_stock:g}-{minimum_stock:g}", f"Low Stock Alert: {item.get('name') or 'Item'}", body)
        expiry = cls._dt(item.get("expiry_date"))
        if expiry is None and item.get("has_expiry") and item.get("shelf_life_days") and item.get("created_at"):
            created_at = cls._dt(item.get("created_at"))
            if created_at is not None:
                try:
                    expiry = created_at + timedelta(days=int(item.get("shelf_life_days") or 0))
                except (TypeError, ValueError):
                    expiry = None
        if expiry is not None:
            days = (expiry - datetime.now()).days
            if 0 <= days <= 7:
                body = cls._table_html("Product Expiry Alert", {
                    "Item": item.get("name") or "Item",
                    "SKU": item.get("sku") or item.get("item_code") or "-",
                    "Expiry Date": cls._date(expiry),
                    "Days Remaining": str(days),
                }, "An inventory item is expiring within the next 7 days.")
                for email in recipients:
                    await cls._send_once(account_id, email, "expiry_alert", f"expiry-{item_id}-{cls._date_key(expiry)}", f"Expiry Alert: {item.get('name') or 'Item'}", body)

    @classmethod
    async def scan_due_alerts(cls) -> None:
        cls.ensure_schema()
        if not settings.RESEND_API_KEY:
            return
        with cls._master():
            accounts = postgres_db.execute_query("SELECT DISTINCT account_id FROM users WHERE COALESCE(is_active,TRUE)=TRUE ORDER BY account_id")
        for row in accounts:
            account_id = row.get("account_id")
            if not account_id:
                continue
            await cls._scan_overdue(account_id)
            await cls._scan_delivery(account_id)
            await cls._scan_stock(account_id)
            await cls._scan_expiry(account_id)

    @classmethod
    async def scan_account_alerts(cls, account_id: str) -> None:
        cls.ensure_schema()
        if not account_id or not settings.RESEND_API_KEY:
            return
        await cls._scan_overdue(account_id)
        await cls._scan_delivery(account_id)
        await cls._scan_stock(account_id)
        await cls._scan_expiry(account_id)

    @classmethod
    async def _scan_overdue(cls, account_id: str) -> None:
        with cls._master():
            rows = postgres_db.execute_query("""
                SELECT i.id,i.invoice_number,i.invoice_date,i.due_date,i.total_amount,i.paid_amount,
                       c.company_name AS customer_company_name,c.first_name AS customer_first_name,c.last_name AS customer_last_name
                FROM invoices i
                LEFT JOIN customers c ON c.id=i.customer_id AND c.account_id=i.account_id
                WHERE i.account_id=%s
                  AND COALESCE(i.paid_amount,0) < COALESCE(i.total_amount,0)
                  AND COALESCE(i.due_date::date,i.invoice_date::date) <= CURRENT_DATE - INTERVAL '14 days'
                  AND COALESCE(LOWER(i.status),'') NOT IN ('cancelled','draft')
            """, (account_id,))
        for row in rows:
            body = cls._table_html("Overdue Invoice Payment Alert", {
                "Invoice Number": row.get("invoice_number") or "",
                "Customer": cls._customer_name(row),
                "Due Date": cls._date(row.get("due_date") or row.get("invoice_date")),
                "Outstanding Amount": cls._money((row.get("total_amount") or 0) - (row.get("paid_amount") or 0)),
            }, "An invoice has remained unpaid for more than two weeks.")
            for email in cls._recipients(account_id, "paymentReminders"):
                await cls._send_once(account_id, email, "payment_reminder", f"overdue-{row['id']}", f"Overdue Payment Alert: {row.get('invoice_number') or 'Invoice'}", body)

    @classmethod
    async def _scan_delivery(cls, account_id: str) -> None:
        with cls._master():
            rows = postgres_db.execute_query("""
                SELECT s.id,s.shipment_number,s.expected_delivery,s.invoice_id,s.status,i.invoice_number,
                       c.company_name AS customer_company_name,c.first_name AS customer_first_name,c.last_name AS customer_last_name
                FROM shipments s
                LEFT JOIN invoices i ON i.id=s.invoice_id AND i.account_id=s.account_id
                LEFT JOIN customers c ON c.id=s.customer_id AND c.account_id=s.account_id
                WHERE s.account_id=%s
                  AND s.expected_delivery IS NOT NULL
                  AND DATE(s.expected_delivery) < CURRENT_DATE
                  AND s.actual_delivery IS NULL
                  AND COALESCE(LOWER(s.status),'pending') NOT IN ('delivered','completed','cancelled')
                  AND NOT EXISTS (
                    SELECT 1 FROM delivery_notes dn
                    WHERE dn.account_id=s.account_id
                      AND (dn.shipment_id=s.id OR (s.invoice_id IS NOT NULL AND dn.invoice_id=s.invoice_id))
                      AND COALESCE(LOWER(dn.status),'pending') IN ('delivered','completed')
                  )
            """, (account_id,))
        for row in rows:
            body = cls._table_html("Delivery Status Pending", {
                "Shipment Number": row.get("shipment_number") or "",
                "Invoice Number": row.get("invoice_number") or "",
                "Customer": cls._customer_name(row),
                "Expected Delivery": cls._date(row.get("expected_delivery")),
            }, "A shipment has passed its delivery date without a completed delivery status.")
            for email in cls._recipients(account_id, "deliveryAlerts"):
                await cls._send_once(account_id, email, "delivery_alert", f"delivery-{row['id']}-{cls._date_key(row.get('expected_delivery'))}", f"Delivery Status Alert: {row.get('shipment_number') or 'Shipment'}", body)

    @classmethod
    async def _scan_stock(cls, account_id: str) -> None:
        with cls._master():
            items = postgres_db.execute_query("SELECT id FROM items WHERE account_id=%s AND COALESCE(is_active,TRUE)=TRUE AND COALESCE(current_stock,0) <= COALESCE(minimum_stock,0)", (account_id,))
        for item in items:
            await cls.item_changed(account_id, item["id"])

    @classmethod
    async def _scan_expiry(cls, account_id: str) -> None:
        with cls._master():
            items = PostgresInventoryService.get_expiry_tracking(account_id)
        for item in items:
            await cls.item_changed(account_id, item["id"])

    @classmethod
    def _recipients(cls, account_id: str, key: str) -> List[str]:
        cls.ensure_schema()
        with cls._master():
            rows = postgres_db.execute_query("""
                SELECT u.email AS user_email,o.email AS org_email,np.email,np.push,np.sms,np.invoice_alerts,np.stock_alerts,np.payment_reminders,np.delivery_alerts
                FROM users u
                LEFT JOIN public.notification_preferences np ON np.account_id=u.account_id AND np.user_id=u.id
                LEFT JOIN organizations o ON o.account_id=u.account_id
                WHERE u.account_id=%s AND COALESCE(u.is_active,TRUE)=TRUE
                ORDER BY COALESCE(u.is_admin,FALSE) DESC,u.id ASC
            """, (account_id,))
        seen: Set[str] = set()
        emails: List[str] = []
        for row in rows:
            prefs = cls._row_to_prefs(row)
            email = (row.get("user_email") or row.get("org_email") or "").strip().lower()
            if not email or not prefs.get("email") or not prefs.get(key) or email in seen:
                continue
            seen.add(email)
            emails.append(email)
        return emails

    @classmethod
    async def _send_once(cls, account_id: str, to_email: str, alert_type: str, fingerprint: str, subject: str, body: str, attachments: Optional[List[Dict[str, str]]] = None) -> None:
        cls.ensure_schema()
        with cls._master():
            row = postgres_db.execute_single(
                "INSERT INTO public.notification_delivery_log (account_id,recipient_email,alert_type,fingerprint,created_at) VALUES (%s,%s,%s,%s,NOW()) ON CONFLICT (account_id,recipient_email,alert_type,fingerprint) DO NOTHING RETURNING id",
                (account_id, to_email, alert_type, fingerprint),
            )
        if not row:
            return
        delivered = await cls._send_email(to_email, subject, body, attachments)
        if delivered:
            return
        with cls._master():
            postgres_db.execute_update(
                "DELETE FROM public.notification_delivery_log WHERE account_id=%s AND recipient_email=%s AND alert_type=%s AND fingerprint=%s",
                (account_id, to_email, alert_type, fingerprint),
            )

    @staticmethod
    async def _send_email(to_email: str, subject: str, body: str, attachments: Optional[List[Dict[str, str]]] = None) -> bool:
        if not settings.RESEND_API_KEY:
            return False
        payload: Dict[str, Any] = {
            "from": NOTIFICATION_SENDER,
            "to": [to_email],
            "subject": subject,
            "html": body,
        }
        if attachments:
            payload["attachments"] = attachments
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(settings.RESEND_API_URL, headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}", "Content-Type": "application/json"}, json=payload, timeout=30.0)
            if response.status_code not in (200, 201):
                print("Failed to send notification email")
                return False
            return True
        except Exception:
            print("Failed to send notification email")
            return False

    @classmethod
    def _invoice_email_data(cls, account_id: str, invoice_id: int) -> Optional[Dict[str, str]]:
        with cls._master():
            inv = postgres_db.execute_single("""
                SELECT i.*,c.company_name AS customer_company_name,c.first_name AS customer_first_name,c.last_name AS customer_last_name,
                       c.billing_address AS customer_billing_address,c.shipping_address AS customer_shipping_address,
                       c.city AS customer_city,c.state AS customer_state,c.postal_code AS customer_postal_code,c.email AS customer_email,c.gst_number AS customer_gst_number
                FROM invoices i LEFT JOIN customers c ON c.id=i.customer_id AND c.account_id=i.account_id
                WHERE i.account_id=%s AND i.id=%s
            """, (account_id, invoice_id))
            if not inv:
                return None
            items = postgres_db.execute_query("SELECT item_name,hsn_code,quantity,unit_price,discount_amount,tax_rate,cgst_rate,sgst_rate,igst_rate FROM invoice_items WHERE account_id=%s AND invoice_id=%s ORDER BY id", (account_id, invoice_id))
            org = postgres_db.execute_single("SELECT company_name,address,city,state,postal_code,phone,email,gst_number,bank_name,bank_account_number,bank_ifsc_code,bank_account_holder_name,terms_and_conditions,tax_invoice_color,rcm_applicable,logo_data FROM organizations WHERE account_id=%s LIMIT 1", (account_id,)) or {}
            creator = postgres_db.execute_single("SELECT first_name,last_name,username,signature_name,signature_style FROM users WHERE account_id=%s AND id=%s", (account_id, inv.get("created_by"))) if inv.get("created_by") else None
        req = GeneratePDFRequest(
            invoice_number=str(inv.get("invoice_number") or ""),
            invoice_date=cls._iso(inv.get("invoice_date")),
            due_date=cls._iso(inv.get("due_date")),
            payment_terms=inv.get("payment_terms") or "Immediate",
            notes=inv.get("notes"),
            freight_charges=float(inv.get("freight_charges") or 0),
            freight_gst_rate=float(inv.get("freight_gst_rate") or 0),
            items=[InvoiceItem(item_name=str(i.get("item_name") or "Item"), hsn_code=i.get("hsn_code"), quantity=float(i.get("quantity") or 0), unit_price=float(i.get("unit_price") or 0), discount_amount=float(i.get("discount_amount") or 0), gst_rate=float(i.get("tax_rate") or 0), cgst_rate=float(i.get("cgst_rate") or 0), sgst_rate=float(i.get("sgst_rate") or 0), igst_rate=float(i.get("igst_rate") or 0)) for i in items],
            customer=CustomerInfo(company_name=inv.get("customer_company_name"), first_name=inv.get("customer_first_name"), last_name=inv.get("customer_last_name"), billing_address=inv.get("billing_address") or inv.get("customer_billing_address"), shipping_address=inv.get("shipping_address") or inv.get("customer_shipping_address"), city=inv.get("customer_city"), state=inv.get("customer_state"), postal_code=inv.get("customer_postal_code"), email=inv.get("customer_email"), gst_number=inv.get("customer_gst_number")),
            organization=OrganizationInfo(company_name=org.get("company_name"), address=org.get("address"), city=org.get("city"), state=org.get("state"), postal_code=org.get("postal_code"), phone=org.get("phone"), email=org.get("email"), gst_number=org.get("gst_number"), bank_name=org.get("bank_name"), bank_account_number=org.get("bank_account_number"), bank_ifsc_code=org.get("bank_ifsc_code"), bank_account_holder_name=org.get("bank_account_holder_name"), terms_and_conditions=org.get("terms_and_conditions"), tax_invoice_color=org.get("tax_invoice_color") or "#4c1d95", rcm_applicable=bool(org.get("rcm_applicable", False)), logo_data=org.get("logo_data")),
            signature_name=(creator or {}).get("signature_name") or cls._user_name(creator),
            signature_style=(creator or {}).get("signature_style") or "handwritten",
        )
        pdf = base64.b64encode(create_pdf_with_reportlab(req)).decode("utf-8")
        return {"invoice_number": str(inv.get("invoice_number") or ""), "invoice_date": cls._date(inv.get("invoice_date")), "customer_name": cls._customer_name(inv), "total_amount": cls._money(inv.get("total_amount") or 0), "pdf_base64": pdf}

    @classmethod
    def _row_to_prefs(cls, row: Optional[Dict[str, Any]]) -> Dict[str, bool]:
        if not row:
            return dict(cls.DEFAULTS)
        return {
            "email": bool(row.get("email", cls.DEFAULTS["email"])),
            "push": bool(row.get("push", cls.DEFAULTS["push"])),
            "sms": bool(row.get("sms", cls.DEFAULTS["sms"])),
            "invoiceAlerts": bool(row.get("invoice_alerts", cls.DEFAULTS["invoiceAlerts"])),
            "stockAlerts": bool(row.get("stock_alerts", cls.DEFAULTS["stockAlerts"])),
            "paymentReminders": bool(row.get("payment_reminders", cls.DEFAULTS["paymentReminders"])),
            "deliveryAlerts": bool(row.get("delivery_alerts", cls.DEFAULTS["deliveryAlerts"])),
        }

    @classmethod
    def _normalize(cls, payload: Dict[str, Any]) -> Dict[str, bool]:
        merged = dict(cls.DEFAULTS)
        for key in merged:
            if key in payload:
                merged[key] = bool(payload[key])
        return merged

    @staticmethod
    def _table_html(title: str, rows: Dict[str, str], intro: str) -> str:
        cells = "".join([f"<tr><td style='padding:6px 12px 6px 0;font-weight:700;'>{html.escape(k)}</td><td>{html.escape(v)}</td></tr>" for k, v in rows.items()])
        return f"<div style='font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;'><h2 style='margin-bottom:12px;'>{html.escape(title)}</h2><p>{html.escape(intro)}</p><table style='border-collapse:collapse;min-width:420px;'>{cells}</table></div>"

    @classmethod
    def _invoice_html(cls, data: Dict[str, str]) -> str:
        return cls._table_html("New Tax Invoice Generated", {"Invoice Number": data["invoice_number"], "Invoice Date": data["invoice_date"], "Customer": data["customer_name"], "Total Amount": data["total_amount"]}, "A new tax invoice has been created and is attached to this email for internal reference.")

    @staticmethod
    def _customer_name(row: Optional[Dict[str, Any]]) -> str:
        if not row:
            return "Customer"
        return str(row.get("customer_company_name") or f"{row.get('customer_first_name') or ''} {row.get('customer_last_name') or ''}".strip() or "Customer")

    @staticmethod
    def _user_name(row: Optional[Dict[str, Any]]) -> Optional[str]:
        if not row:
            return None
        return f"{row.get('first_name') or ''} {row.get('last_name') or ''}".strip() or row.get("username")

    @staticmethod
    def _money(value: Any) -> str:
        return f"₹{float(Decimal(str(value or 0))):,.2f}"

    @staticmethod
    def _dt(value: Any) -> Optional[datetime]:
        if not value:
            return None
        if isinstance(value, datetime):
            return value
        if isinstance(value, date):
            return datetime.combine(value, datetime.min.time())
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
            except ValueError:
                return None
        return None

    @classmethod
    def _date(cls, value: Any) -> str:
        dt = cls._dt(value)
        return dt.strftime("%d %b %Y") if dt else ""

    @classmethod
    def _date_key(cls, value: Any) -> str:
        dt = cls._dt(value)
        return dt.strftime("%Y-%m-%d") if dt else "unknown"

    @classmethod
    def _iso(cls, value: Any) -> Optional[str]:
        dt = cls._dt(value)
        return dt.isoformat() if dt else None

    @classmethod
    @contextmanager
    def _master(cls):
        previous = get_request_user_context()
        set_request_user_context({"id": None, "account_id": None, "username": "system", "is_admin": True, "is_master": True})
        try:
            yield
        finally:
            set_request_user_context(previous)
