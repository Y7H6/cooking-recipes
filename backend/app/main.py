"""FastAPI アプリケーションの入口。

起動方法:
    uvicorn app.main:app --reload

現時点では /api/health のみ実装。
各ユースケース（UC-01〜）の実装に伴い routers/ を include していく。
"""

from fastapi import FastAPI

app = FastAPI(
    title="cooking-recipes API",
    description="味覚AI PoC（Epicure × Jev × Qwen）バックエンド API",
    version="0.1.0",
)


@app.get("/api/health", tags=["health"])
def health_check() -> dict[str, str]:
    """ヘルスチェックエンドポイント。

    Returns:
        {"status": "ok"} を返す。
    """
    return {"status": "ok"}
