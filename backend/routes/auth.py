from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
)
from models import db, User

import os
import secrets
import string
import smtplib
from email.mime.text import MIMEText

auth_bp = Blueprint("auth", __name__)


# ---------------------------------------------------------------------
# Helper: generate temporary password
# ---------------------------------------------------------------------
def generate_temp_password(length: int = 10) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


# ---------------------------------------------------------------------
# Helper: send email (simple SMTP)
# ---------------------------------------------------------------------
def send_email(to_email: str, subject: str, body: str):
    """
    Simple SMTP mail sender.
    Configure these environment variables:

    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_USE_TLS (optional, "1" or "true")
    """
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    use_tls = os.getenv("SMTP_USE_TLS", "1").lower() in ("1", "true", "yes")

    if not smtp_host or not smtp_user or not smtp_password:
        raise RuntimeError("SMTP configuration is not set properly")

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = to_email

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        if use_tls:
            server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)


# ---------------------------------------------------------------------
# 🔐 LOGIN — Authenticate user and return token + profile
# ---------------------------------------------------------------------
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "Username and Password required"}), 400

    user = User.query.filter_by(username=username, is_active=True).first()
    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid username or password"}), 401

    access_token = create_access_token(identity=str(user.id))

    return jsonify(
        {
            "access_token": access_token,
            "user": {
                "id": user.id,
                "username": user.username,
                "full_name": user.full_name,
                "email": user.email,
                "phone": user.phone,
                "role": user.role,
                "is_approver": user.is_approver,
            },
        }
    ), 200


# ---------------------------------------------------------------------
# 👤 PROFILE — GET & UPDATE USER INFO
#   GET  /auth/me   → get user profile
#   PUT  /auth/me   → update profile (full_name, email, phone)
# ---------------------------------------------------------------------
@auth_bp.route("/me", methods=["GET", "PUT"])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    # ───────────── GET Profile ───────────── #
    if request.method == "GET":
        return jsonify(
            {
                "id": user.id,
                "username": user.username,
                "full_name": user.full_name,
                "email": user.email,
                "phone": user.phone,
                "role": user.role,
                "is_approver": user.is_approver,
            }
        ), 200

    # ───────────── UPDATE Profile ───────────── #
    data = request.get_json() or {}

    if "full_name" in data:
        user.full_name = data["full_name"]

    if "email" in data:
        user.email = data["email"]

    if "phone" in data:
        user.phone = data["phone"]

    db.session.commit()

    return jsonify(
        {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "is_approver": user.is_approver,
        }
    ), 200


# ---------------------------------------------------------------------
# 🔐 PASSWORD CHANGE — Must verify old password
# ---------------------------------------------------------------------
@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    data = request.get_json() or {}
    old_password = data.get("old_password")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")

    if not old_password or not new_password or not confirm_password:
        return jsonify({"message": "All fields required"}), 400

    if not user.check_password(old_password):
        return jsonify({"message": "Old password incorrect"}), 400

    if new_password != confirm_password:
        return jsonify({"message": "New password does not match"}), 400

    if len(new_password) < 8:
        return jsonify({"message": "Password must be at least 8 characters"}), 400

    user.set_password(new_password)
    db.session.commit()

    return jsonify({"message": "Password updated successfully"}), 200


# ---------------------------------------------------------------------
# 🔁 FORGOT PASSWORD — username + email → send temporary password
#   POST /auth/forgot-password
#   Body: { "username": "...", "email": "..." }
# ---------------------------------------------------------------------
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json() or {}
    username = data.get("username")
    email = data.get("email")

    if not username or not email:
        return jsonify({"message": "Username and Email are required"}), 400

    user = User.query.filter_by(username=username, is_active=True).first()

    # For security, do not reveal whether user/email exists
    if not user or not user.email or user.email.lower() != email.lower():
        # Always return 200 with generic message
        return jsonify(
            {
                "message": "If the information is correct, a password reset email will be sent."
            }
        ), 200

    # Generate temporary password
    temp_password = generate_temp_password(10)
    user.set_password(temp_password)
    db.session.commit()

    # Prepare email content
    subject = "Your temporary password"
    body = (
        f"Hello {user.full_name or user.username},\n\n"
        "You requested a password reset for the Booking Messenger System.\n\n"
        f"Your temporary password is: {temp_password}\n\n"
        "Please log in using this temporary password and then change it immediately.\n\n"
        "Best regards,\n"
        "Booking Messenger System"
    )

    try:
        send_email(user.email, subject, body)
    except Exception as e:
        print(">>> Error sending reset email:", e)
        # You can decide whether to expose this error or not; here we keep it generic
        return jsonify(
            {
                "message": "Unable to send reset email at this time. Please contact administrator."
            }
        ), 500

    return jsonify(
        {
            "message": "If the information is correct, a password reset email will be sent."
        }
    ), 200