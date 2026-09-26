# backend/app/schemas/search.py

"""検索・ランキングAPIのPydanticスキーマ。

設計書: api-spec-details.md §K, §L / recipe-selection-ui-design.md §2.5
"""

from typing import Any, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# 入力スキーマ（Request）
# ---------------------------------------------------------------------------


class TasteVector(BaseModel):
    """味覚6軸ベクトル（各軸 0〜100）"""

    sweet: int = Field(default=50, ge=0, le=100)
    salty: int = Field(default=50, ge=0, le=100)
    bitter: int = Field(default=50, ge=0, le=100)
    spicy: int = Field(default=50, ge=0, le=100)
    umami: int = Field(default=50, ge=0, le=100)
    overall: int = Field(default=50, ge=0, le=100)


class AromaVector(BaseModel):
    """香り2軸ベクトル"""

    intensity: int = Field(default=50, ge=0, le=100)
    family: Optional[str] = Field(
        default=None,
        description="herbal/spice/citrus/nutty/smoky/fermented/floral/none",
    )


class TextureVector(BaseModel):
    """食感2軸ベクトル"""

    intensity: int = Field(default=50, ge=0, le=100)
    profile: Optional[str] = Field(
        default=None,
        description="crispy/chewy/tender/creamy/juicy/crunchy/fluffy/none",
    )


class FunctionVector(BaseModel):
    """用途プロファイル（各軸 0〜100）"""

    thickener: int = Field(default=50, ge=0, le=100)
    sweetener: int = Field(default=50, ge=0, le=100)
    souring_agent: int = Field(default=50, ge=0, le=100)
    umami_booster: int = Field(default=50, ge=0, le=100)
    aromatic_base: int = Field(default=50, ge=0, le=100)
    fat_source: int = Field(default=50, ge=0, le=100)


class NutritionVector(BaseModel):
    """栄養プロファイル（各軸 0〜100）"""

    high_fat: int = Field(default=50, ge=0, le=100)
    high_protein: int = Field(default=50, ge=0, le=100)
    high_carb: int = Field(default=50, ge=0, le=100)
    fiber_rich: int = Field(default=50, ge=0, le=100)
    vitamin_rich: int = Field(default=50, ge=0, le=100)
    low_calorie: int = Field(default=50, ge=0, le=100)


class TasteSearchRequest(BaseModel):
    """POST /api/recipes/search-by-taste のリクエスト本文"""

    taste: Optional[TasteVector] = None
    aroma: Optional[AromaVector] = None
    texture: Optional[TextureVector] = None
    function: Optional[FunctionVector] = None
    nutrition: Optional[NutritionVector] = None
    sort_by: str = Field(default="overall", description="並べ替え軸")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$")
    min_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    limit: int = Field(default=10, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class RankingRequest(BaseModel):
    """POST /api/recipes/ranking のリクエスト本文"""

    sort_by: str = Field(description="並べ替え軸")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$")
    filters: Optional[dict[str, Any]] = Field(default=None)
    limit: int = Field(default=10, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


# ---------------------------------------------------------------------------
# 出力スキーマ（Response）
# ---------------------------------------------------------------------------


class TasteScoreResponse(BaseModel):
    """ taste_scores テーブルのレスポンス用フィールド"""

    sweet: Optional[int] = None
    salty: Optional[int] = None
    bitter: Optional[int] = None
    spicy: Optional[int] = None
    umami: Optional[int] = None
    overall: Optional[int] = None
    confidence: Optional[float] = None


class AromaResponse(BaseModel):
    """香りレスポンス"""

    intensity: Optional[int] = None
    family: Optional[str] = None
    family_probabilities: Optional[dict[str, float]] = Field(
        default=None, description="各系統の確率分布"
    )


class TextureResponse(BaseModel):
    """食感レスポンス"""

    intensity: Optional[int] = None
    profile: Optional[str] = None
    profile_probabilities: Optional[dict[str, float]] = Field(
        default=None, description="各系統の確率分布"
    )


class FunctionProfileResponse(BaseModel):
    """用途プロファイルレスポンス"""

    thickener: Optional[int] = None
    sweetener: Optional[int] = None
    souring_agent: Optional[int] = None
    umami_booster: Optional[int] = None
    aromatic_base: Optional[int] = None
    fat_source: Optional[int] = None


class NutritionProfileResponse(BaseModel):
    """栄養プロファイルレスポンス"""

    high_fat: Optional[int] = None
    high_protein: Optional[int] = None
    high_carb: Optional[int] = None
    fiber_rich: Optional[int] = None
    vitamin_rich: Optional[int] = None
    low_calorie: Optional[int] = None


class TasteSearchResult(BaseModel):
    """search-by-taste 検索結果の1件"""

    recipe_id: int
    title: str
    taste_score: TasteScoreResponse
    aroma: Optional[AromaResponse] = None
    texture: Optional[TextureResponse] = None
    function_profile: Optional[FunctionProfileResponse] = None
    nutrition_profile: Optional[NutritionProfileResponse] = None
    similarity_score: float


class TasteSearchResponse(BaseModel):
    """POST /api/recipes/search-by-taste のレスポンス本文"""

    results: list[TasteSearchResult]
    total: int
    search_params: dict[str, Any]


class RankingItem(BaseModel):
    """ranking リストの1件"""

    recipe_id: int
    title: str
    score: int  # sort_by に応じたスコア値


class RankingResponse(BaseModel):
    """POST /api/recipes/ranking のレスポンス本文"""

    ranking: list[RankingItem]
    total: int
    sort_by: str
    sort_order: str
