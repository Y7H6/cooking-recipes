# alembic/ — DB マイグレーション

## 方針

- SQLAlchemy 2.0（DeclarativeBase）+ alembic を使用し、スキーマ変更はすべてマイグレーションで管理する。
- `Base.metadata`（[app/core/db.py](../app/core/db.py)）を autogenerate のソースとする。
- pgvector 拡張の有効化（`CREATE EXTENSION IF NOT EXISTS vector;`）は初期マイグレーションで行う。

## 初期化手順（後続タスク）

```bash
cd backend
uv run alembic init alembic
# alembic.ini の sqlalchemy.url を設定値から読み込むよう修正
uv run alembic revision --autogenerate -m "initial schema"
uv run alembic upgrade head
```

## 注意事項

- 本番環境では `alembic upgrade head` をデプロイ手順に含める。
- マイグレーションの巻き戻し（downgrade）はデータ損失に注意して実装する。
