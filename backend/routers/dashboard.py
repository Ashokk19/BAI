"""
BAI Backend Dashboard Router - PostgreSQL Version

This module contains the dashboard routes for analytics and key metrics.
Now using direct PostgreSQL operations instead of SQLAlchemy.
"""

from fastapi import APIRouter, Depends, Query
from utils.auth_deps import get_current_user
from services.postgres_inventory_service import PostgresInventoryService
from typing import Dict, Any, List
from datetime import datetime, timedelta
from database.postgres_db import postgres_db
from psycopg2.extras import RealDictCursor

router = APIRouter()

def get_date_filter(timeline: str):
    """Get date filter based on timeline"""
    now = datetime.now()
    if timeline == "Today":
        return now.date(), now.date()
    elif timeline == "This Week":
        start = now - timedelta(days=now.weekday())
        return start.date(), now.date()
    elif timeline == "This Month":
        start = now.replace(day=1)
        return start.date(), now.date()
    elif timeline == "This Year":
        start = now.replace(month=1, day=1)
        return start.date(), now.date()
    return now.date(), now.date()

@router.get("/")
async def get_dashboard_data(
    timeline: str = Query("Today", enum=["Today", "This Week", "This Month", "This Year"]),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get comprehensive dashboard data from PostgreSQL database."""
    account_id = current_user["account_id"]
    start_date, end_date = get_date_filter(timeline)
    
    with postgres_db.get_connection() as conn:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Inventory summary
        summary = PostgresInventoryService.get_inventory_summary(account_id)
        total_items = summary.get("total_items", 0)
        low_stock = summary.get("low_stock_items", 0)
        total_value = float(summary.get("total_stock_value", 0.0) or 0.0)
        
        # Get sales data (invoices)
        cursor.execute("""
            SELECT 
                COALESCE(SUM(total_amount), 0) as total_sales,
                COUNT(*) as invoice_count,
                COALESCE(SUM(paid_amount), 0) as paid_amount,
                COALESCE(SUM(total_amount - paid_amount), 0) as pending_amount
            FROM invoices
            WHERE account_id = %s AND invoice_date BETWEEN %s AND %s
        """, (account_id, start_date, end_date))
        sales_data = cursor.fetchone()
        
        # Get customer count - active = customers with any invoices ever
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT c.id) as total_customers,
                COUNT(DISTINCT CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM invoices i 
                        WHERE i.customer_id = c.id 
                        AND i.account_id = c.account_id
                    ) THEN c.id 
                END) as active_customers
            FROM customers c
            WHERE c.account_id = %s
        """, (account_id,))
        customer_data = cursor.fetchone()
        
        # Get pending shipments - check both shipments and delivery_notes tables
        # Case-insensitive check for status values
        cursor.execute("""
            SELECT 
                (SELECT COUNT(*) FROM shipments 
                 WHERE account_id = %s AND LOWER(status) IN ('pending', 'in_transit', 'in transit')) +
                (SELECT COUNT(*) FROM delivery_notes 
                 WHERE account_id = %s AND LOWER(status) IN ('pending', 'in_transit', 'in transit'))
                as pending_shipments
        """, (account_id, account_id))
        shipment_data = cursor.fetchone()
        
        # Get delivery notes stats
        cursor.execute("""
            SELECT 
                COUNT(*) as total_deliveries,
                COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
            FROM delivery_notes
            WHERE account_id = %s AND delivery_date BETWEEN %s AND %s
        """, (account_id, start_date, end_date))
        delivery_data = cursor.fetchone()
        
        # Calculate growth (compare with previous period)
        prev_start = start_date - (end_date - start_date)
        cursor.execute("""
            SELECT COALESCE(SUM(total_amount), 0) as prev_sales
            FROM invoices
            WHERE account_id = %s AND invoice_date BETWEEN %s AND %s
        """, (account_id, prev_start, start_date))
        prev_sales = cursor.fetchone()['prev_sales']
        
        growth = 0
        if prev_sales > 0:
            growth = ((sales_data['total_sales'] - prev_sales) / prev_sales) * 100
        
        # Build KPIs
        kpis: List[Dict[str, Any]] = [
            {
                "title": "Total Stock Value",
                "value": f"₹{total_value:,.2f}",
                "change": "Current inventory worth",
                "change_type": "positive",
                "description": f"{total_items} items in stock"
            },
            {
                "title": "Sales",
                "value": f"₹{float(sales_data['total_sales']):,.2f}",
                "change": f"{growth:+.1f}% vs previous period" if growth != 0 else "No change",
                "change_type": "positive" if growth >= 0 else "negative",
                "description": f"{sales_data['invoice_count']} invoices"
            },
            {
                "title": "Active Customers",
                "value": str(customer_data['active_customers']),
                "change": f"Total: {customer_data['total_customers']} customers",
                "change_type": "positive",
                "description": f"Customers with recent activity"
            },
            {
                "title": "Pending Shipments",
                "value": str(shipment_data['pending_shipments']),
                "change": "Orders awaiting delivery",
                "change_type": "neutral",
                "description": "In transit or pending"
            },
            {
                "title": "Low Stock Items",
                "value": str(int(low_stock)),
                "change": "Items below minimum",
                "change_type": "negative" if low_stock > 0 else "positive",
                "description": "Requires restocking"
            },
            {
                "title": "Revenue Growth",
                "value": f"{growth:.1f}%",
                "change": f"vs previous {timeline.lower()}",
                "change_type": "positive" if growth >= 0 else "negative",
                "description": "Period over period"
            },
        ]
        
        # Sales overview - daily breakdown
        cursor.execute("""
            SELECT 
                TO_CHAR(invoice_date, 'Mon DD') as date,
                COALESCE(SUM(total_amount), 0) as sales
            FROM invoices
            WHERE account_id = %s AND invoice_date BETWEEN %s AND %s
            GROUP BY invoice_date
            ORDER BY invoice_date
        """, (account_id, start_date, end_date))
        sales_overview = [dict(row) for row in cursor.fetchall()]
        
        # Inventory status - Show top items by stock value
        cursor.execute("""
            SELECT 
                i.name as item_name,
                CASE 
                    WHEN i.category IS NULL OR TRIM(i.category) = '' THEN 'General'
                    ELSE TRIM(i.category)
                END as category,
                COALESCE(i.current_stock, 0) as current_stock,
                COALESCE(i.selling_price, 0) as selling_price,
                (COALESCE(i.current_stock, 0) * COALESCE(i.selling_price, 0)) as stock_value
            FROM items i
            WHERE i.account_id = %s
            ORDER BY current_stock DESC
            LIMIT 10
        """, (account_id,))
        
        inventory_status = [
            {
                "name": f"{row['item_name']} ({row['category']})",
                "value": int(row["current_stock"] or 0),
                "category": row["category"]
            } for row in cursor.fetchall()
        ]
        
        # Recent activity
        cursor.execute("""
            (SELECT 'Invoice Created' as action, 
                    'Invoice ' || invoice_number || ' for ₹' || total_amount as details,
                    created_at as activity_time
             FROM invoices
             WHERE account_id = %s
             ORDER BY created_at DESC
             LIMIT 3)
            UNION ALL
            (SELECT 'Delivery Note' as action,
                    'Delivery ' || delivery_note_number || ' - ' || status as details,
                    created_at as activity_time
             FROM delivery_notes
             WHERE account_id = %s
             ORDER BY created_at DESC
             LIMIT 3)
            UNION ALL
            (SELECT 'Payment Received' as action,
                    'Payment ' || payment_number || ' - ₹' || amount as details,
                    payment_date as activity_time
             FROM payments
             WHERE account_id = %s
             ORDER BY payment_date DESC
             LIMIT 3)
            ORDER BY activity_time DESC
            LIMIT 10
        """, (account_id, account_id, account_id))
        
        activities = cursor.fetchall()
        recent_activity = [
            {
                "action": a['action'],
                "details": a['details'],
                "time": a['activity_time'].strftime("%b %d, %I:%M %p") if a['activity_time'] else "N/A"
            } for a in activities
        ]
        
        cursor.close()
    
    return {
        "kpis": kpis,
        "sales_overview": sales_overview,
        "inventory_status": inventory_status,
        "recent_activity": recent_activity,
    }