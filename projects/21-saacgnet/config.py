import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()

class Config:
    """Configuración base de la aplicación"""

    # Flask
    SECRET_KEY = os.environ.get("SECRET_KEY") or "dev-secret-key-change-in-production"
    PORT = int(os.environ.get("PORT", 5021))

    # Base de datos
    # Fallback to SQLite if DATABASE_URL not set or PostgreSQL not available
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or "sqlite:///saacgnet.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False
    
    # Archivos
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500 MB
    UPLOAD_EXTENSIONS = {".xlsx", ".xls", ".xlsm"}
    UPLOAD_FOLDER = "/tmp/saacgnet_uploads"
    
    # Sesiones
    SESSION_TYPE = 'filesystem'
    PERMANENT_SESSION_LIFETIME = timedelta(hours=8)
    
    # Procesamiento
    MAX_WORKERS = 4
    CHUNK_SIZE = 1000  # Registros por lote para inserción
    
    # Paginación
    ITEMS_PER_PAGE = 50
    MAX_ITEMS_PER_PAGE = 1000

class DevelopmentConfig(Config):
    """Configuración para desarrollo"""
    DEBUG = True
    SQLALCHEMY_ECHO = False  # Desactivado para reducir logging excesivo

class ProductionConfig(Config):
    """Configuración para producción"""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or Config.SQLALCHEMY_DATABASE_URI
    SECRET_KEY = os.environ.get("SECRET_KEY") or Config.SECRET_KEY

# Selección de configuración según entorno
config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
