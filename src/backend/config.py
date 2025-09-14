import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-key-change-me")
    
    # JWT Configuration
    JWT_ACCESS_TOKEN_EXPIRES = False  # Tokens don't expire for development
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"
    JWT_IDENTITY_CLAIM = "sub"

    # Example: mysql+pymysql://user:password@localhost:3306/todd
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root@localhost:3306/todd",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False


