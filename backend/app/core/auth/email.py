"""Outbound transactional email via Brevo's HTTP API.

If BREVO_API_KEY isn't configured, sending is skipped with a log line
instead of failing - consistent with the app's lazy-DB-connection style of
degrading gracefully rather than blocking startup/requests on an optional
external dependency.
"""
import httpx

from app.config import settings

BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"


def _send(*, to_email: str, subject: str, html_content: str) -> None:
    if not settings.brevo_api_key:
        print(f"[email] Brevo not configured, skipping send to {to_email}: {subject}")
        return

    try:
        response = httpx.post(
            BREVO_SEND_URL,
            headers={
                "api-key": settings.brevo_api_key,
                "content-type": "application/json",
                "accept": "application/json",
            },
            json={
                "sender": {"email": settings.brevo_sender_email, "name": settings.brevo_sender_name},
                "to": [{"email": to_email}],
                "subject": subject,
                "htmlContent": html_content,
            },
            timeout=10.0,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        # Never let an email-delivery failure break the calling request.
        print(f"[email] Failed to send to {to_email}: {exc}")


def send_verification_email(*, to_email: str, name: str, raw_token: str) -> None:
    link = f"{settings.frontend_base_url}/verify-email?token={raw_token}"
    _send(
        to_email=to_email,
        subject="Verify your MedCore HMS account",
        html_content=(
            f"<p>Hi {name},</p>"
            f"<p>Please verify your email by clicking the link below:</p>"
            f'<p><a href="{link}">{link}</a></p>'
            f"<p>This link expires in 24 hours.</p>"
        ),
    )


def send_password_reset_email(*, to_email: str, name: str, raw_token: str) -> None:
    link = f"{settings.frontend_base_url}/reset-password?token={raw_token}"
    _send(
        to_email=to_email,
        subject="Reset your MedCore HMS password",
        html_content=(
            f"<p>Hi {name},</p>"
            f"<p>Click the link below to reset your password:</p>"
            f'<p><a href="{link}">{link}</a></p>'
            f"<p>This link expires in 30 minutes. If you didn't request this, ignore this email.</p>"
        ),
    )
