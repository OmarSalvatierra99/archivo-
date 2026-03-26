import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY") or "dev-secret-key-change-in-production"
    PORT = int(os.environ.get("PORT", 5022))

    SQLALCHEMY_DATABASE_URI = "sqlite:///scg4.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False

    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500 MB
    UPLOAD_EXTENSIONS = {".txt"}

    SESSION_TYPE = "filesystem"
    PERMANENT_SESSION_LIFETIME = timedelta(hours=8)

    ITEMS_PER_PAGE = 50
    MAX_ITEMS_PER_PAGE = 1000


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
