"""環境変数ベースのアプリケーション設定。

pydantic-settings を使用し、.env（または環境変数）から読み込む。
設定値はハードコードせず、すべて本モジュール経由で取得する。
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """アプリケーション全体の設定。

    Attributes:
        database_url: PostgreSQL 接続文字列（psycopg ドライバ）。
        jev_api_key: Jev API（TypeSafe AI）の認証キー。
        qwen_endpoint: Qwen Local LLM（Ollama）のエンドポイント URL。
        epicure_csv_path: Epicure 食材ベクトル CSV のパス。
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/cooking_recipes"
    jev_api_key: str = ""
    qwen_endpoint: str = "http://localhost:11434"
    epicure_csv_path: str = "backend/data/epicure_core.csv"


@lru_cache
def get_settings() -> Settings:
    """設定インスタンスをキャッシュして返す（プロセス内で 1 回だけ読み込む）。"""
    return Settings()
