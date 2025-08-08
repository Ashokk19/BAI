"""
BAI Backend WhatsApp Service

This module contains the WhatsApp service for sending invoices.
"""

import requests
import json
from typing import Optional, Dict, Any
from datetime import datetime
from decimal import Decimal

class WhatsAppService:
    """Service for sending WhatsApp messages."""
    
    def __init__(self, access_token: str = None, phone_number_id: str = None):
        """Initialize WhatsApp service with credentials."""
        self.access_token = access_token or "your_whatsapp_access_token"  # Replace with actual token
        self.phone_number_id = phone_number_id or "your_phone_number_id"  # Replace with actual ID
        self.base_url = "https://graph.facebook.com/v17.0"
    
    def send_invoice_message(
        self, 
        recipient_phone: str, 
        invoice_data: Dict[str, Any],
        customer_data: Dict[str, Any],
        custom_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send invoice via WhatsApp."""
        
        # Clean phone number (remove + and ensure proper format)
        clean_phone = recipient_phone.replace("+", "").replace(" ", "").replace("-", "")
        
        # Create invoice message
        invoice_message = self._create_invoice_message(invoice_data, customer_data, custom_message)
        
        # Prepare WhatsApp API payload
        payload = {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "text",
            "text": {
                "preview_url": False,
                "body": invoice_message
            }
        }
        
        # For demonstration, we'll simulate sending
        # In production, you would make an actual API call
        return self._simulate_send_message(payload, invoice_data)
    
    def _create_invoice_message(
        self, 
        invoice_data: Dict[str, Any],
        customer_data: Dict[str, Any],
        custom_message: Optional[str] = None
    ) -> str:
        """Create formatted invoice message for WhatsApp."""
        
        # Get customer display name
        customer_name = customer_data.get("display_name", "Valued Customer")
        
        # Format invoice details
        invoice_number = invoice_data.get("invoice_number", "N/A")
        invoice_date = invoice_data.get("invoice_date", datetime.now())
        if isinstance(invoice_date, str):
            invoice_date = datetime.fromisoformat(invoice_date.replace('Z', '+00:00'))
        
        formatted_date = invoice_date.strftime("%d-%m-%Y")
        total_amount = invoice_data.get("total_amount", 0)
        
        # Get invoice items
        items = invoice_data.get("items", [])
        items_text = ""
        for i, item in enumerate(items, 1):
            item_name = item.get("item_name", "Item")
            quantity = item.get("quantity", 0)
            unit_price = item.get("unit_price", 0)
            line_total = item.get("line_total", 0)
            
            items_text += f"{i}. {item_name}\n"
            items_text += f"   Qty: {quantity} × ₹{unit_price:.2f} = ₹{line_total:.2f}\n"
        
        # Create message
        message = f"""🧾 *TAX INVOICE*

Dear {customer_name},

Thank you for your business! Here's your invoice details:

📋 *Invoice Details:*
Invoice No: {invoice_number}
Date: {formatted_date}
Due Date: {invoice_data.get('due_date', 'Immediate')}

📦 *Items:*
{items_text}

💰 *Payment Summary:*
Subtotal: ₹{invoice_data.get('subtotal', 0):.2f}
CGST: ₹{invoice_data.get('total_cgst', 0):.2f}
SGST: ₹{invoice_data.get('total_sgst', 0):.2f}
IGST: ₹{invoice_data.get('total_igst', 0):.2f}
*Total Amount: ₹{total_amount:.2f}*

💳 *Payment Terms:* {invoice_data.get('payment_terms', 'Immediate')}

{custom_message or 'Please make the payment as per the terms. Thank you for choosing us!'}

---
*BAI - Billing and Inventory Management*
Tamil Nadu, India
"""
        
        return message
    
    def _simulate_send_message(self, payload: Dict[str, Any], invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate sending WhatsApp message (for demonstration)."""
        
        # In a real implementation, you would make this API call:
        # url = f"{self.base_url}/{self.phone_number_id}/messages"
        # headers = {
        #     "Authorization": f"Bearer {self.access_token}",
        #     "Content-Type": "application/json"
        # }
        # response = requests.post(url, json=payload, headers=headers)
        
        # For now, simulate a successful response
        return {
            "success": True,
            "message": "Invoice sent successfully via WhatsApp",
            "whatsapp_message_id": f"wamid.{datetime.now().timestamp()}",
            "recipient": payload["to"],
            "invoice_number": invoice_data.get("invoice_number", "N/A"),
            "timestamp": datetime.now().isoformat()
        }
    
    def send_payment_reminder(
        self, 
        recipient_phone: str, 
        invoice_data: Dict[str, Any],
        customer_data: Dict[str, Any],
        days_overdue: int = 0
    ) -> Dict[str, Any]:
        """Send payment reminder via WhatsApp."""
        
        customer_name = customer_data.get("display_name", "Valued Customer")
        invoice_number = invoice_data.get("invoice_number", "N/A")
        total_amount = invoice_data.get("total_amount", 0)
        balance_due = invoice_data.get("balance_due", total_amount)
        
        if days_overdue > 0:
            urgency = "🔴 *URGENT*"
            status_text = f"Your payment is {days_overdue} days overdue."
        else:
            urgency = "📋 *PAYMENT REMINDER*"
            status_text = "Your payment is due."
        
        message = f"""{urgency}

Dear {customer_name},

{status_text}

Invoice Details:
• Invoice No: {invoice_number}
• Amount Due: ₹{balance_due:.2f}
• Due Date: {invoice_data.get('due_date', 'N/A')}

Please make the payment at your earliest convenience to avoid any inconvenience.

Thank you for your cooperation!

---
*BAI - Billing and Inventory Management*
Tamil Nadu, India
"""
        
        payload = {
            "messaging_product": "whatsapp",
            "to": recipient_phone.replace("+", "").replace(" ", "").replace("-", ""),
            "type": "text",
            "text": {
                "preview_url": False,
                "body": message
            }
        }
        
        return self._simulate_send_message(payload, invoice_data)
    
    def send_payment_confirmation(
        self, 
        recipient_phone: str, 
        invoice_data: Dict[str, Any],
        customer_data: Dict[str, Any],
        payment_amount: Decimal
    ) -> Dict[str, Any]:
        """Send payment confirmation via WhatsApp."""
        
        customer_name = customer_data.get("display_name", "Valued Customer")
        invoice_number = invoice_data.get("invoice_number", "N/A")
        
        message = f"""✅ *PAYMENT RECEIVED*

Dear {customer_name},

Thank you! We have received your payment.

Payment Details:
• Invoice No: {invoice_number}
• Amount Paid: ₹{payment_amount:.2f}
• Date: {datetime.now().strftime('%d-%m-%Y')}

Your account has been updated. Thank you for your business!

---
*BAI - Billing and Inventory Management*
Tamil Nadu, India
"""
        
        payload = {
            "messaging_product": "whatsapp",
            "to": recipient_phone.replace("+", "").replace(" ", "").replace("-", ""),
            "type": "text",
            "text": {
                "preview_url": False,
                "body": message
            }
        }
        
        return self._simulate_send_message(payload, invoice_data)

# Global instance
whatsapp_service = WhatsAppService() 