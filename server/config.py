from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    port: int = 8000

    class Config:
        env_file = "server/.env"
        env_file_encoding = "utf-8"


settings = Settings()
