import os
from dotenv import load_dotenv

# -------------------------------------------------------
# Load .env from same directory
# -------------------------------------------------------
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path)


class Config:
    # ===============================
    # DATABASE CONFIG
    # ===============================
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///dev.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ===============================
    # JWT AUTH CONFIG
    # ===============================
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "CHANGE_ME_SECRET")
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_EXPIRES_MIN", 1440))  # default 24hr

    # ===============================
    # SMTP EMAIL CONFIG (Forgot Password)
    # ===============================
    SMTP_HOST = os.getenv("SMTP_HOST", "")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "1").lower() in ("1", "true", "yes")

    # ===============================
    # Optional Security / Debug Control
    # ===============================
    DEBUG = os.getenv("DEBUG", "0").lower() == "true"

    # ===============================
    # Allowed origins for CORS
    # ===============================
    CORS_ALLOW = os.getenv("CORS_ALLOW", "*").split(",")

    # ===============================
    # FOR RESET PASSWORD by TOKEN (Optional)
    # ===============================
    APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:3000")