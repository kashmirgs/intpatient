from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    UPPERMIND_URL: str = "http://10.10.0.149:3000"
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "deepseek-ocr"
    TRANSLATOR_AGENT_ID: int = 1
    UPLOAD_DIR: str = "./uploads"
    DATABASE_URL: str = "sqlite:///./intpatient.db"
    MAX_UPLOAD_SIZE_MB: int = 50
    CORS_ORIGINS: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


settings = Settings()
