"""SQLAlchemy の engine / session 定義（最小構成）。

TODO(UC-11): Epicure 食材マスタ取り込み時に Base.metadata.create_all /
    alembic マイグレーションでテーブルを作成する。
TODO(UC-01): レシピ検索用クエリ実装時に pgvector 拡張（CREATE EXTENSION vector）
    を alembic マイグレーションで有効化する。
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

# psycopg ドライバ（synchronous）を使用。
# 非同期化が必要な場合は asyncpg / psycopg AsyncConnection に切替を検討する。
engine = create_engine(settings.database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    """ORM モデルの基底クラス（app/models/ にモデルを追加していく）。"""


def get_db() -> Generator[Session, None, None]:
    """FastAPI の依存性注入用セッション生成器。

    Yields:
        要求スコープの SQLAlchemy Session。
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
