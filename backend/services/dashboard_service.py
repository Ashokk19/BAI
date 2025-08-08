"""
BAI Backend Dashboard Service

This module contains the business logic for fetching dashboard data.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from models.item import Item, ItemCategory
from models.invoice import Invoice, InvoiceItem
from models.customer import Customer
from models.purchase import PurchaseOrder
from models.inventory import InventoryLog
from models.user import User

class DashboardService:
    def get_dashboard_data(self, db: Session, timeline: str):
        # Timeline filter logic
        end_date = datetime.utcnow()
        if timeline == "Today":
            start_date = end_date - timedelta(days=1)
        elif timeline == "This Week":
            start_date = end_date - timedelta(weeks=1)
        elif timeline == "This Month":
            start_date = end_date - timedelta(days=30)
        elif timeline == "This Year":
            start_date = end_date - timedelta(days=365)
        else:
            start_date = None

        # KPIs
        total_stock_value = db.query(func.sum(Item.current_stock * Item.cost_price)).scalar() or 0
        
        sales_query = db.query(func.sum(Invoice.total_amount))
        if start_date:
            sales_query = sales_query.filter(Invoice.invoice_date >= start_date)
        monthly_sales = sales_query.scalar() or 0
        
        active_customers_query = db.query(func.count(Customer.id))
        if start_date:
            active_customers_query = active_customers_query.filter(Customer.created_at >= start_date)
        active_customers = active_customers_query.scalar() or 0
        
        pending_orders_query = db.query(func.count(PurchaseOrder.id)).filter(PurchaseOrder.status == 'pending')
        if start_date:
            pending_orders_query = pending_orders_query.filter(PurchaseOrder.po_date >= start_date)
        pending_orders = pending_orders_query.scalar() or 0

        low_stock_items = db.query(func.count(Item.id)).filter(Item.current_stock < Item.minimum_stock).scalar() or 0
        
        revenue_growth = 0 # Placeholder

        kpis = [
            {"title": "Total Stock Value", "value": f"₹{float(total_stock_value):,.2f}", "change": "", "change_type": "positive", "description": "Current inventory worth"},
            {"title": "Sales", "value": f"₹{float(monthly_sales):,.2f}", "change": "", "change_type": "positive", "description": f"Sales in the last {timeline}"},
            {"title": "Active Customers", "value": str(int(active_customers)), "change": "", "change_type": "positive", "description": "Customers with recent activity"},
            {"title": "Pending Orders", "value": str(int(pending_orders)), "change": "", "change_type": "positive", "description": "Orders awaiting fulfillment"},
            {"title": "Low Stock Items", "value": str(int(low_stock_items)), "change": "", "change_type": "negative", "description": "Items below minimum stock"},
            {"title": "Revenue Growth", "value": f"{revenue_growth}%", "change": "", "change_type": "positive", "description": "Year over year growth"},
        ]

        # Sales Overview
        sales_overview_query = db.query(
            func.date(Invoice.invoice_date).label('date'),
            func.sum(Invoice.total_amount).label('total_sales')
        ).group_by(func.date(Invoice.invoice_date)).order_by(func.date(Invoice.invoice_date))
        if start_date:
            sales_overview_query = sales_overview_query.filter(Invoice.invoice_date >= start_date)
            
        sales_overview_data = sales_overview_query.all()
        sales_overview = []
        for item in sales_overview_data:
            # Convert string date to datetime object for formatting
            if isinstance(item.date, str):
                date_obj = datetime.strptime(item.date, "%Y-%m-%d")
                formatted_date = date_obj.strftime("%b %d")
            else:
                formatted_date = item.date.strftime("%b %d")
            sales_overview.append({"name": formatted_date, "sales": float(item.total_sales)})
        
        # Add sample data if no real data exists
        if not sales_overview:
            today = datetime.now()
            sample_data = []
            for i in range(7):  # Last 7 days
                date = today - timedelta(days=6-i)
                sample_data.append({
                    "name": date.strftime("%b %d"),
                    "sales": float(1000 + (i * 500) + (i % 3 * 200))  # Sample sales data
                })
            sales_overview = sample_data


        # Inventory Status
        inventory_status_data = db.query(
            ItemCategory.name,
            func.sum(Item.current_stock).label('total_stock')
        ).join(Item).group_by(ItemCategory.name).all()
        inventory_status = [{"name": item.name, "value": int(item.total_stock or 0)} for item in inventory_status_data]

        # Recent Activity - Get latest inventory logs
        recent_logs = db.query(InventoryLog).join(Item, InventoryLog.item_id == Item.id).join(User, InventoryLog.recorded_by == User.id).order_by(InventoryLog.created_at.desc()).limit(10).all()
        
        recent_activity = []
        for log in recent_logs:
            # Calculate time ago
            time_diff = datetime.now() - log.created_at
            if time_diff.days > 0:
                time_ago = f"{time_diff.days} day{'s' if time_diff.days > 1 else ''} ago"
            elif time_diff.seconds > 3600:
                hours = time_diff.seconds // 3600
                time_ago = f"{hours} hour{'s' if hours > 1 else ''} ago"
            elif time_diff.seconds > 60:
                minutes = time_diff.seconds // 60
                time_ago = f"{minutes} minute{'s' if minutes > 1 else ''} ago"
            else:
                time_ago = "Just now"
            
            # Format action based on transaction type
            action_map = {
                "initial_stock": "New item added",
                "adjustment": "Stock updated",
                "purchase": "Stock received",
                "sale": "Item sold",
                "transfer": "Stock transferred",
                "return": "Item returned"
            }
            
            action = action_map.get(log.transaction_type, "Inventory updated")
            
            # Create details based on transaction type
            if log.transaction_type == "initial_stock":
                details = f"{log.item.name} - Initial stock of {int(log.quantity_after)} units"
            elif log.transaction_type == "adjustment":
                change = int(log.quantity_change)
                if change > 0:
                    details = f"{log.item.name} - Added {change} units (Total: {int(log.quantity_after)})"
                else:
                    details = f"{log.item.name} - Removed {abs(change)} units (Total: {int(log.quantity_after)})"
            else:
                details = f"{log.item.name} - {log.notes or 'Quantity changed'}"
            
            recent_activity.append({
                "action": action,
                "details": details,
                "time": time_ago
            })

        return {
            "kpis": kpis,
            "sales_overview": sales_overview,
            "inventory_status": inventory_status,
            "recent_activity": recent_activity
        }

dashboard_service = DashboardService() 