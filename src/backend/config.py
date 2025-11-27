import os

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-key-change-me")

    JWT_ACCESS_TOKEN_EXPIRES = False
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"
    JWT_IDENTITY_CLAIM = "sub"

    # If DATABASE_URL is set (Docker compose), use it. Otherwise pick local/dev.
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")

    if not SQLALCHEMY_DATABASE_URI:
        ENV = os.getenv("ENV")
        if ENV == "production":
            # SQLALCHEMY_DATABASE_URI = "mysql+pymysql://mysql:password@/CAPSTONE?unix_socket=/cloudsql/capstone"
            SQLALCHEMY_DATABASE_URI = "mysql+pymysql://mysql:password@34.67.41.7:3306/CAPSTONE"
        else:
            # Local dev, running MySQL on your host machine.
            # If you mapped container port 3306 to host 3307, use 3307 here.
            SQLALCHEMY_DATABASE_URI = "mysql+pymysql://root:password@127.0.0.1:3307/todd"

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Email Configuration
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "true").lower() in ["true", "on", "1"]
    MAIL_USE_SSL = os.getenv("MAIL_USE_SSL", "false").lower() in ["true", "on", "1"]
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", "noreply@projectmanagement.com")
    
    # Application URL for invitation links
    APP_URL = os.getenv("APP_URL", "http://localhost:3000")

    # Optional: avoid stale connections on restarts
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280
    }
