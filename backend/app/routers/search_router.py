# backend/app/routers/search_router.py

"""検索・ランキングAPIエンドポイント。

設計書: api-spec-details.md §K, §L / recipe-selection-ui-design.md §2.5
- POST /api/recipes/search-by-taste — 複数チャート対応の類似度検索
- POST /api/recipes/ranking — 並べ替え・絞り込み
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..schemas.search import (
    RankingItem,
    RankingRequest,
    RankingResponse,
    TasteSearchRequest,
    TasteSearchResponse,
    TasteSearchResult,
)
from ..services.taste_search_service import (
    AromaVector,
    FunctionVector,
    NutritionVector,
    TextureVector,
    TasteVector,
    get_ranking,
    search_by_taste,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/recipes", tags=["search"])


# ---------------------------------------------------------------------------
# POST /api/recipes/search-by-taste
# ---------------------------------------------------------------------------


@router.post("/search-by-taste", response_model=TasteSearchResponse)
def search_by_taste_endpoint(
    request: TasteSearchRequest,
    db: Session = Depends(get_db),
) -> TasteSearchResponse:
    """複数チャート対応の類似度検索。

    taste_scores テーブルから条件に合うレシピを検索し、
    指定されたチャートの類似度を計算してソートする。

    - taste, aroma, texture, function, nutrition はすべて任意パラメータ
    - sort_by で任意の軸を昇順/降順に並べ替え可能
    """
    try:
        # Pydantic オブジェクトを dataclass に変換
        taste_vec = None
        if request.taste:
            taste_vec = TasteVector(
                sweet=float(request.taste.sweet),
                salty=float(request.taste.salty),
                bitter=float(request.taste.bitter),
                spicy=float(request.taste.spicy),
                umami=float(request.taste.umami),
                overall=float(request.taste.overall),
            )

        aroma_vec = None
        if request.aroma:
            aroma_vec = AromaVector(
                intensity=float(request.aroma.intensity),
                family=request.aroma.family,
            )

        texture_vec = None
        if request.texture:
            texture_vec = TextureVector(
                intensity=float(request.texture.intensity),
                profile=request.texture.profile,
            )

        function_vec = None
        if request.function:
            function_vec = FunctionVector(
                thickener=float(request.function.thickener),
                sweetener=float(request.function.sweetener),
                souring_agent=float(request.function.souring_agent),
                umami_booster=float(request.function.umami_booster),
                aromatic_base=float(request.function.aromatic_base),
                fat_source=float(request.function.fat_source),
            )

        nutrition_vec = None
        if request.nutrition:
            nutrition_vec = NutritionVector(
                high_fat=float(request.nutrition.high_fat),
                high_protein=float(request.nutrition.high_protein),
                high_carb=float(request.nutrition.high_carb),
                fiber_rich=float(request.nutrition.fiber_rich),
                vitamin_rich=float(request.nutrition.vitamin_rich),
                low_calorie=float(request.nutrition.low_calorie),
            )

        result = search_by_taste(
            db=db,
            taste=taste_vec,
            aroma=aroma_vec,
            texture=texture_vec,
            function=function_vec,
            nutrition=nutrition_vec,
            sort_by=request.sort_by,
            sort_order=request.sort_order,
            min_confidence=request.min_confidence,
            limit=request.limit,
            offset=request.offset,
        )

        return TasteSearchResponse(
            results=[
                TasteSearchResult(**r)  # type: ignore[arg-type]
                for r in result["results"]
            ],
            total=result["total"],
            search_params=result["search_params"],
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("search-by-taste エラー: %s", e)
        raise HTTPException(status_code=500, detail="内部サーバーエラー")


# ---------------------------------------------------------------------------
# POST /api/recipes/ranking
# ---------------------------------------------------------------------------


@router.post("/ranking", response_model=RankingResponse)
def ranking_endpoint(
    request: RankingRequest,
    db: Session = Depends(get_db),
) -> RankingResponse:
    """並べ替え・絞り込み。

    taste_scores テーブルからソート結果を返却する。
    filters でジャンル・香り系統・食感系統・信頼度・おみのみフィルタが可能。
    """
    try:
        result = get_ranking(
            db=db,
            sort_by=request.sort_by,
            sort_order=request.sort_order,
            filters=request.filters,
            limit=request.limit,
            offset=request.offset,
        )

        return RankingResponse(
            ranking=[RankingItem(**r) for r in result["ranking"]],
            total=result["total"],
            sort_by=result["sort_by"],
            sort_order=result["sort_order"],
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("ranking エラー: %s", e)
        raise HTTPException(status_code=500, detail="内部サーバーエラー")
