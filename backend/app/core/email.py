import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def get_nova_themed_html(title: str, greeting: str, body_text: str, action_text: str = None, action_url: str = None) -> str:
    """
    Generates a premium whiteboard-themed (N.O.V.A) HTML template.
    """
    action_button_html = ""
    if action_text and action_url:
        action_button_html = f"""
        <div style="margin: 28px 0; text-align: center;">
            <a href="{action_url}" style="
                display: inline-block;
                background-color: #E75A3D;
                color: #ffffff;
                text-decoration: none;
                font-family: 'Comic Sans MS', 'Courier New', sans-serif;
                font-weight: bold;
                font-size: 16px;
                padding: 12px 24px;
                border: 3px solid #1E1E1E;
                border-radius: 8px;
                box-shadow: 4px 4px 0px 0px #1E1E1E;
                transition: all 0.2s ease;
            ">
                {action_text}
            </a>
        </div>
        """

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{title}</title>
    </head>
    <body style="
        background-color: #FAF6EE;
        font-family: 'Courier New', Courier, monospace, sans-serif;
        color: #1E1E1E;
        margin: 0;
        padding: 40px 20px;
    ">
        <div style="
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border: 3px solid #1E1E1E;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 6px 6px 0px 0px #1E1E1E;
        ">
            <!-- Header -->
            <div style="
                text-align: center;
                border-bottom: 2px dashed #1E1E1E;
                padding-bottom: 20px;
                margin-bottom: 25px;
            ">
                <h1 style="
                    font-family: 'Comic Sans MS', 'Courier New', sans-serif;
                    color: #E75A3D;
                    margin: 0 0 5px 0;
                    font-size: 36px;
                ">N.O.V.A.</h1>
                <p style="
                    margin: 0;
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    color: #7E7E7E;
                ">Beyond Scores. Towards Understanding.</p>
            </div>

            <!-- Content -->
            <div style="font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
                <p style="font-weight: bold; font-size: 18px; margin-top: 0;">{greeting}</p>
                <p style="color: #333333;">{body_text}</p>
                {action_button_html}
            </div>

            <!-- Sticky Note Style Tip -->
            <div style="
                background-color: #FEF08A;
                border: 2px solid #1E1E1E;
                padding: 15px;
                border-radius: 8px;
                font-size: 13px;
                margin-bottom: 25px;
                box-shadow: 3px 3px 0px 0px #1E1E1E;
            ">
                <p style="margin: 0 0 5px 0; font-weight: bold;">Daily Motivation Tip:</p>
                <p style="margin: 0;">"The beautiful thing about learning is that no one can take it away from you." Keep pushing forward!</p>
            </div>

            <!-- Footer -->
            <div style="
                border-top: 2px dashed #E5E7EB;
                padding-top: 20px;
                text-align: center;
                font-size: 11px;
                color: #7E7E7E;
            ">
                <p style="margin: 0 0 10px 0;">You received this because you are enrolled in the N.O.V.A Platform.</p>
                <p style="margin: 0;">
                    <a href="{settings.FRONTEND_URL}/student/settings" style="color: #E75A3D; text-decoration: underline;">Manage notifications</a>
                    &nbsp;|&nbsp;
                    <a href="#" style="color: #E75A3D; text-decoration: underline;">Unsubscribe</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """

def send_themed_email(to_email: str, subject: str, title: str, greeting: str, body_text: str, action_text: str = None, action_url: str = None):
    """
    Constructs and sends an HTML themed email. Falls back to console printing.
    """
    html_content = get_nova_themed_html(title, greeting, body_text, action_text, action_url)

    # 1. Try sending via SMTP if configured
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    sender_email = os.getenv("SENDER_EMAIL", "noreply@nova-platform.edu")

    sent = False
    if smtp_host and smtp_port and smtp_user and smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = sender_email
            msg["To"] = to_email

            part = MIMEText(html_content, "html")
            msg.attach(part)

            with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(sender_email, to_email, msg.as_string())
            sent = True
        except Exception as e:
            print(f"[EMAIL SERVICE ERROR] Failed to send email via SMTP: {e}")

    # 2. Always print a beautiful console log representation (ideal for development/verification!)
    print("\n" + "="*80)
    print(f"N.O.V.A. EMAIL DISPATCHED TO: {to_email}")
    print(f"Subject: {subject}")
    print("-"*80)
    print(f"Title: {title}")
    print(f"Greeting: {greeting}")
    print(f"Body: {body_text}")
    if action_text and action_url:
        print(f"Action button: [{action_text}] -> {action_url}")
    print("="*80 + "\n")

    return sent
