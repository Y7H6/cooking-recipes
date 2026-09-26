# backend/app/main.py

"""FastAPI アプリケーションの入口。

起動方法:
    uvicorn app.main:app --reload

現時点では /api/health および検索系エンドポイントを実装。
各ユースケース（UC-01〜）の実装に伴い routers/ を include していく。
"""

from fastapi import FastAPI

from .routers.search_router import router as search_router

app = FastAPI(
    title="cooking-recipes API",
    description="味覚AI PoC（Epicure x Jev x Qwen）バックエンド API",
    version="0.1.0",
)

# ルーター登録
app.include_router(search_router)


@app.get("/api/health", tags=["health"])
def health_check() -> dict[str, str]:
    """ヘルスチェックエンドポイント。

    Returns:
        {"status": "ok"} を返す。
    """
    return {"status": "ok"}
