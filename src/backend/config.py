import os


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-key-change-me")

    JWT_ACCESS_TOKEN_EXPIRES = False
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"
    JWT_IDENTITY_CLAIM = "sub"

    ENV = os.getenv("ENV")

    if ENV == "production":
        SQLALCHEMY_DATABASE_URI = "mysql+pymysql://mysql:password@34.27.104.45:3306/CAPSTONE"
    else:  # local dev
        SQLALCHEMY_DATABASE_URI = "mysql+pymysql://root:password@localhost:3306/CAPSTONE"  # default local

    SQLALCHEMY_TRACK_MODIFICATIONS = False
