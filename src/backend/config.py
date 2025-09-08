import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-key-change-me")

    # Example: mysql+pymysql://user:password@localhost:3306/todd
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root@localhost:3306/todd",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False


