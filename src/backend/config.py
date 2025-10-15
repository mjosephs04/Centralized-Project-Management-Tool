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
            SQLALCHEMY_DATABASE_URI = "mysql+pymysql://mysql:password@34.27.104.45:3306/CAPSTONE"
        else:
            # Local dev, running MySQL on your host machine.
            # If you mapped container port 3306 to host 3307, use 3307 here.
            SQLALCHEMY_DATABASE_URI = "mysql+pymysql://root:password@127.0.0.1:3307/todd"

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Optional: avoid stale connections on restarts
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280
    }