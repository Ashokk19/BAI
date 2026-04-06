"""
Email Router - Resend Integration

This module handles email sending via Resend API.
All email operations are server-side to protect the API key.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import httpx
from datetime import datetime

from config.settings import settings
from utils.postgres_auth_deps import get_current_user

router = APIRouter()

EMAIL_SENDER = "support@av2solutions.in"


class EmailAttachment(BaseModel):
    """Email attachment model."""
    filename: str
    content: str  # Base64 encoded content
    content_type: Optional[str] = "application/pdf"


class SendEmailRequest(BaseModel):
    """Request model for sending emails."""
    to: EmailStr
    subject: str
    html: str
    attachments: Optional[List[EmailAttachment]] = None


class SendInvoiceEmailRequest(BaseModel):
    """Request model for sending invoice emails."""
    to: EmailStr
    customer_name: str
    invoice_number: str
    invoice_date: str
    amount: str
    pdf_base64: str  # Base64 encoded PDF content
    # Organization data
    company_name: Optional[str] = None
    company_email: Optional[str] = None
    user_name: Optional[str] = None


class SendPaymentReminderRequest(BaseModel):
    """Request model for sending payment reminder emails."""
    to: EmailStr
    customer_name: str
    invoice_number: str
    invoice_date: str
    pending_amount: str
    # Organization data
    company_name: Optional[str] = None
    company_email: Optional[str] = None
    user_name: Optional[str] = None


async def _deliver_email(request: SendEmailRequest):
    resend_api_key = settings.RESEND_API_KEY
    if not resend_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email service is not configured"
        )

    try:
        payload = {
            "from": EMAIL_SENDER,
            "to": [request.to],
            "subject": request.subject,
            "html": request.html,
        }

        if request.attachments:
            payload["attachments"] = [
                {
                    "filename": att.filename,
                    "content": att.content,
                    "content_type": att.content_type or "application/pdf"
                }
                for att in request.attachments
            ]

        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.RESEND_API_URL,
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=30.0
            )

        if response.status_code in (200, 201):
            return {"success": True, "message": "Email sent successfully", "data": response.json()}

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to send email"
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Email service timed out. Please try again."
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to connect to email service"
        )


@router.post("/send")
async def send_email(request: SendEmailRequest, current_user: dict = Depends(get_current_user)):
    """
    Send an email via Resend API.
    This is a generic email sending endpoint.
    """
    return await _deliver_email(request)


@router.post("/send-invoice")
async def send_invoice_email(request: SendInvoiceEmailRequest, current_user: dict = Depends(get_current_user)):
    """
    Send a tax invoice email with PDF attachment.
    """
    # Use organization data or defaults
    company_name = request.company_name or "Your Company"
    company_email = request.company_email or EMAIL_SENDER
    user_name = request.user_name or "Team"
    current_year = datetime.now().year
    
    # Build professional HTML email body
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
            .footer {{ background: #374151; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }}
            .amount {{ font-size: 24px; font-weight: bold; color: #059669; }}
            .details {{ background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }}
            .btn {{ display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Tax Invoice</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">{company_name}</p>
            </div>
            <div class="content">
                <p>Dear <strong>{request.customer_name}</strong>,</p>
                
                <p>Please find attached your Tax Invoice for your recent transaction with us.</p>
                
                <div class="details">
                    <p style="margin: 5px 0;"><strong>Invoice Number:</strong> {request.invoice_number}</p>
                    <p style="margin: 5px 0;"><strong>Invoice Date:</strong> {request.invoice_date}</p>
                    <p style="margin: 5px 0;"><strong>Amount:</strong> <span class="amount">₹{request.amount}</span></p>
                </div>
                
                <p>Thank you for your business. We truly appreciate your trust in our services.</p>
                
                <p>For any queries or assistance regarding this invoice, please feel free to contact us at <a href="mailto:{company_email}">{company_email}</a>.</p>
                
                <p style="margin-top: 30px;">
                    Warm regards,<br/>
                    <strong>{user_name}</strong><br/>
                    <span style="color: #666;">{company_name}</span>
                </p>
            </div>
            <div class="footer">
                <p>This is an automated email from {company_name}.</p>
                <p>© {current_year} {company_name}. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    # Prepare the email request
    email_request = SendEmailRequest(
        to=request.to,
        subject=f"Tax Invoice #{request.invoice_number} from {company_name}",
        html=html_body,
        attachments=[
            EmailAttachment(
                filename=f"Invoice-{request.invoice_number}.pdf",
                content=request.pdf_base64,
                content_type="application/pdf"
            )
        ]
    )

    return await _deliver_email(email_request)


@router.post("/send-payment-reminder")
async def send_payment_reminder(request: SendPaymentReminderRequest, current_user: dict = Depends(get_current_user)):
    """
    Send a payment reminder email for an unpaid invoice.
    """
    # Use organization data or defaults
    company_name = request.company_name or "Your Company"
    company_email = request.company_email or EMAIL_SENDER
    user_name = request.user_name or "Team"
    current_year = datetime.now().year
    
    # Build professional HTML email body
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
            .footer {{ background: #374151; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }}
            .amount {{ font-size: 24px; font-weight: bold; color: #dc2626; }}
            .details {{ background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }}
            .notice {{ background: #fef3c7; border: 1px solid #fcd34d; padding: 15px; border-radius: 8px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">Payment Reminder</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">{company_name}</p>
            </div>
            <div class="content">
                <p>Dear <strong>{request.customer_name}</strong>,</p>
                
                <p>This is a gentle reminder that the following invoice is currently pending payment:</p>
                
                <div class="details">
                    <p style="margin: 5px 0;"><strong>Invoice Number:</strong> {request.invoice_number}</p>
                    <p style="margin: 5px 0;"><strong>Invoice Date:</strong> {request.invoice_date}</p>
                    <p style="margin: 5px 0;"><strong>Pending Amount:</strong> <span class="amount">₹{request.pending_amount}</span></p>
                </div>
                
                <div class="notice">
                    <p style="margin: 0;"><strong>🔔 Friendly Reminder:</strong> We kindly request you to process the payment at your earliest convenience.</p>
                </div>
                
                <p>If you have already made the payment, please disregard this message. Sometimes payments may cross in transit.</p>
                
                <p>For any queries or assistance, feel free to reach us at <a href="mailto:{company_email}">{company_email}</a>.</p>
                
                <p>Thank you for your continued support.</p>
                
                <p style="margin-top: 30px;">
                    Warm regards,<br/>
                    <strong>{user_name}</strong><br/>
                    <span style="color: #666;">{company_name}</span>
                </p>
            </div>
            <div class="footer">
                <p>This is an automated payment reminder from {company_name}.</p>
                <p>© {current_year} {company_name}. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    # Prepare the email request (no attachment for reminders)
    email_request = SendEmailRequest(
        to=request.to,
        subject=f"Payment Reminder for Invoice #{request.invoice_number} — {company_name}",
        html=html_body,
        attachments=None
    )

    return await _deliver_email(email_request)
