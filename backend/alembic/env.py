# backend/alembic/env.py

"""Alembic 環境設定ファイル。

SQLAlchemy のメタデータを読み込み、マイグレーションを適用する。
"""

import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import MetaData, engine_from_config, pool
from sqlalchemy.orm import DeclarativeBase

# backend/app をインポートパスに追加
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import get_settings  # noqa: E402
from app.models.recipe import Base as RecipeBase  # noqa: E402
from app.models.taste_score import Base as TasteScoreBase  # noqa: E402

# Alembic コンテキスト設定
config = context.config

# ログ設定
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# データベース URL を環境変数から取得（優先）
db_url = os.environ.get("DATABASE_URL")
if db_url:
    config.set_main_option("sqlalchemy.url", db_url)
else:
    config.set_main_option(
        "sqlalchemy.url",
        get_settings().database_url,
    )

# メタデータ収集（両方のモデルから）
target_metadata = MetaData()
target_metadata._metadata_for = {}  # type: ignore[attr-defined]

# Base クラスからメタデータを取得
for base in [RecipeBase, TasteScoreBase]:
    for table in base.metadata.tables.values():
        target_metadata._metadata_for[table.key] = table  # type: ignore[attr-defined]


def run_migrations_offline() -> None:
    """オフラインマイグレーションを実行。"""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """オンラインマイグレーションを実行。"""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
