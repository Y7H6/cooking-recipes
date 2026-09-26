# backend/app/services/taste_search_service.py

"""味覚チャート検索サービス（複数チャート対応）。

設計書: recipe-selection-ui-design.md §2.6 / api-spec-details.md §K, §L
- taste_scores テーブルから類似レシピを検索
- コサイン類似度によるマルチチャート計算
- AND検索ロジック（各軸の指定はAND条件）
"""

import logging
from dataclasses import dataclass
from typing import Any, Optional

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# ベクトルデータクラス
# ---------------------------------------------------------------------------


@dataclass
class TasteVector:
    """味覚6軸ベクトル（各軸 0〜100）"""

    sweet: float = 50.0
    salty: float = 50.0
    bitter: float = 50.0
    spicy: float = 50.0
    umami: float = 50.0
    overall: float = 50.0


@dataclass
class AromaVector:
    """香り2軸ベクトル"""

    intensity: float = 50.0
    family: Optional[str] = None


@dataclass
class TextureVector:
    """食感2軸ベクトル"""

    intensity: float = 50.0
    profile: Optional[str] = None


@dataclass
class FunctionVector:
    """用途プロファイル（各軸 0〜100）"""

    thickener: float = 50.0
    sweetener: float = 50.0
    souring_agent: float = 50.0
    umami_booster: float = 50.0
    aromatic_base: float = 50.0
    fat_source: float = 50.0


@dataclass
class NutritionVector:
    """栄養プロファイル（各軸 0〜100）"""

    high_fat: float = 50.0
    high_protein: float = 50.0
    high_carb: float = 50.0
    fiber_rich: float = 50.0
    vitamin_rich: float = 50.0
    low_calorie: float = 50.0


# ---------------------------------------------------------------------------
# ユーティリティ関数
# ---------------------------------------------------------------------------


def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    """2つのリストベクトルのコサイン類似度を計算。

    Args:
        v1: ベクトル1
        v2: ベクトル2

    Returns:
        コサイン類似度（-1.0 〜 1.0）
    """
    if len(v1) != len(v2):
        logger.warning("ベクトル長が一致しません: %d vs %d", len(v1), len(v2))
        return 0.0

    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm1 = sum(a * a for a in v1) ** 0.5
    norm2 = sum(b * b for b in v2) ** 0.5

    if norm1 == 0 or norm2 == 0:
        return 0.0

    return dot_product / (norm1 * norm2)


# ---------------------------------------------------------------------------
# 検索サービス
# ---------------------------------------------------------------------------


def search_by_taste(
    db: Session,
    taste: Optional[TasteVector] = None,
    aroma: Optional[AromaVector] = None,
    texture: Optional[TextureVector] = None,
    function: Optional[FunctionVector] = None,
    nutrition: Optional[NutritionVector] = None,
    sort_by: str = "overall",
    sort_order: str = "desc",
    min_confidence: float = 0.0,
    limit: int = 10,
    offset: int = 0,
) -> dict[str, Any]:
    """複数チャート対応の類似度検索。

    taste_scores テーブルから条件に合うレシピを検索し、
    指定されたチャートの類似度を計算してソートする。

    Args:
        db: SQLAlchemy セッション
        taste: 味覚ベクトル（任意）
        aroma: 香りベクトル（任意）
        texture: 食感ベクトル（任意）
        function: 用途プロファイル（任意）
        nutrition: 栄養プロファイル（任意）
        sort_by: 並べ替え軸（overall/sweet/salty/bitter/spicy/umami/aroma_intensity/texture_intensity）
        sort_order: asc/desc
        min_confidence: 最小信頼度フィルタ
        limit: 取得件数（最大100）
        offset: オフセット

    Returns:
        {
            "results": list[dict],
            "total": int,
            "search_params": dict,
        }

    Raises:
        ValueError: sort_order が asc/desc 以外の場合
    """
    if sort_order not in ("asc", "desc"):
        raise ValueError(f"sort_order must be 'asc' or 'desc', got: {sort_order}")

    # taste_scores のレコードを取得（WHERE 条件）
    query = text("""
        SELECT
            ts.id,
            ts.recipe_id,
            r.title AS recipe_title,
            ts.sweet,
            ts.salty,
            ts.bitter,
            ts.spicy,
            ts.umami,
            ts.overall,
            ts.confidence,
            ts.aroma_intensity,
            ts.aroma_family,
            ts.texture_intensity,
            ts.texture_profile,
            ts.raw_json,
            ts.evaluated_at
        FROM taste_scores ts
        JOIN recipes r ON ts.recipe_id = r.id
        WHERE r.is_deleted = FALSE
    """)

    conditions: list[str] = []
    params: dict[str, Any] = {}

    if min_confidence > 0.0:
        conditions.append("ts.confidence >= :min_confidence")
        params["min_confidence"] = min_confidence

    where_clause = ""
    if conditions:
        where_clause = "AND " + " AND ".join(conditions)
        query = text(f"{query} {where_clause}")

    rows = db.execute(query, params).fetchall()
    column_names = ["id", "recipe_id", "recipe_title", "sweet", "salty", "bitter",
                    "spicy", "umami", "overall", "confidence", "aroma_intensity",
                    "aroma_family", "texture_intensity", "texture_profile", "raw_json",
                    "evaluated_at"]

    results: list[dict[str, Any]] = []

    for row in rows:
        record = dict(zip(column_names, row))

        # 類似度計算
        similarity_score = _calculate_similarity(record, taste, aroma, texture, function, nutrition)
        record["similarity_score"] = round(similarity_score, 4)

        results.append(record)

    # ソート
    sort_column = _resolve_sort_column(sort_by)
    if sort_column == "similarity":
        # similarity_score は辞書のキー
        results.sort(key=lambda x: x.get("similarity_score", 0), reverse=(sort_order == "desc"))
    else:
        results.sort(key=lambda x: x.get(sort_column, 0) or 0, reverse=(sort_order == "desc"))

    total = len(results)

    # ページネーション
    paginated_results = results[offset: offset + limit]

    # レスポンス構築
    formatted_results = []
    for r in paginated_results:
        formatted_results.append({
            "recipe_id": r["recipe_id"],
            "title": r["recipe_title"],
            "taste_score": {
                "sweet": r.get("sweet"),
                "salty": r.get("salty"),
                "bitter": r.get("bitter"),
                "spicy": r.get("spicy"),
                "umami": r.get("umami"),
                "overall": r.get("overall"),
                "confidence": r.get("confidence"),
            },
            "aroma": {
                "intensity": r.get("aroma_intensity"),
                "family": r.get("aroma_family"),
            } if r.get("aroma_intensity") else None,
            "texture": {
                "intensity": r.get("texture_intensity"),
                "profile": r.get("texture_profile"),
            } if r.get("texture_intensity") else None,
            "similarity_score": r["similarity_score"],
        })

    search_params = {}
    if taste:
        search_params["taste"] = taste.__dict__
    if aroma:
        search_params["aroma"] = aroma.__dict__
    if texture:
        search_params["texture"] = texture.__dict__
    if function:
        search_params["function"] = function.__dict__
    if nutrition:
        search_params["nutrition"] = nutrition.__dict__

    return {
        "results": formatted_results,
        "total": total,
        "search_params": search_params,
    }


def get_ranking(
    db: Session,
    sort_by: str,
    sort_order: str = "desc",
    filters: Optional[dict[str, Any]] = None,
    limit: int = 10,
    offset: int = 0,
) -> dict[str, Any]:
    """並べ替え・絞り込み。

    taste_scores テーブルからソート結果を返却する。

    Args:
        db: SQLAlchemy セッション
        sort_by: 並べ替え軸（overall/sweet/salty/bitter/spicy/umami/aroma_intensity/texture_intensity）
        sort_order: asc/desc
        filters: フィルタ条件 {genre, aroma_family, texture_profile, min_confidence, favorite_only}
        limit: 取得件数（最大100）
        offset: オフセット

    Returns:
        {
            "ranking": list[dict],
            "total": int,
            "sort_by": str,
            "sort_order": str,
        }

    Raises:
        ValueError: sort_order が asc/desc 以外の場合
    """
    if sort_order not in ("asc", "desc"):
        raise ValueError(f"sort_order must be 'asc' or 'desc', got: {sort_order}")

    query = text("""
        SELECT
            ts.recipe_id,
            r.title AS recipe_title,
            r.genre,
            r.is_favorite,
            ts.sweet,
            ts.salty,
            ts.bitter,
            ts.spicy,
            ts.umami,
            ts.overall,
            ts.confidence,
            ts.aroma_intensity,
            ts.aroma_family,
            ts.texture_intensity,
            ts.texture_profile
        FROM taste_scores ts
        JOIN recipes r ON ts.recipe_id = r.id
        WHERE r.is_deleted = FALSE
    """)

    conditions: list[str] = []
    params: dict[str, Any] = {}

    if filters:
        if "min_confidence" in filters and filters["min_confidence"] is not None:
            conditions.append("ts.confidence >= :min_confidence")
            params["min_confidence"] = filters["min_confidence"]
        if "aroma_family" in filters and filters["aroma_family"] is not None:
            conditions.append("ts.aroma_family = :aroma_family")
            params["aroma_family"] = filters["aroma_family"]
        if "texture_profile" in filters and filters["texture_profile"] is not None:
            conditions.append("ts.texture_profile = :texture_profile")
            params["texture_profile"] = filters["texture_profile"]
        if filters.get("favorite_only"):
            conditions.append("r.is_favorite = TRUE")

    where_clause = ""
    if conditions:
        where_clause = "AND " + " AND ".join(conditions)
        query = text(f"{query} {where_clause}")

    sort_column = _resolve_sort_column(sort_by)
    query = text(f"{query} ORDER BY {sort_column} {sort_order}")

    rows = db.execute(query, params).fetchall()
    column_names = ["recipe_id", "recipe_title", "genre", "is_favorite", "sweet", "salty",
                    "bitter", "spicy", "umami", "overall", "confidence", "aroma_intensity",
                    "aroma_family", "texture_intensity", "texture_profile"]

    ranking: list[dict[str, Any]] = []
    for row in rows:
        record = dict(zip(column_names, row))
        score_value = record.get(sort_column) or 0
        ranking.append({
            "recipe_id": record["recipe_id"],
            "title": record["recipe_title"],
            "score": score_value,
        })

    total = len(ranking)
    paginated_ranking = ranking[offset: offset + limit]

    return {
        "ranking": paginated_ranking,
        "total": total,
        "sort_by": sort_by,
        "sort_order": sort_order,
    }


# ---------------------------------------------------------------------------
# 内部ヘルパー関数
# ---------------------------------------------------------------------------


def _resolve_sort_column(sort_by: str) -> str:
    """sort_by パラメータを有効なカラム名にマッピング。

    Args:
        sort_by: ユーザー指定の並べ替え軸

    Returns:
        有効なSQLカラム名
    """
    valid_columns = {
        "overall": "ts.overall",
        "sweet": "ts.sweet",
        "salty": "ts.salty",
        "bitter": "ts.bitter",
        "spicy": "ts.spicy",
        "umami": "ts.umami",
        "aroma_intensity": "ts.aroma_intensity",
        "texture_intensity": "ts.texture_intensity",
    }
    return valid_columns.get(sort_by, "ts.overall")


def _calculate_similarity(
    record: dict[str, Any],
    taste: Optional[TasteVector],
    aroma: Optional[AromaVector],
    texture: Optional[TextureVector],
    function: Optional[FunctionVector],
    nutrition: Optional[NutritionVector],
) -> float:
    """複数チャートを横断した類似度を計算。

    設計書 §2.6.1 に基づく重み付きコサイン類似度。

    Args:
        record: taste_scores のレコード辞書
        taste: 味覚ベクトル
        aroma: 香りベクトル
        texture: 食感ベクトル
        function: 用途プロファイル
        nutrition: 栄養プロファイル

    Returns:
        類似度スコア（0.0 〜 1.0）
    """
    vectors: list[list[float]] = []
    weights: list[float] = []

    # 味覚ベクトル（重み: 1.0）
    if taste:
        vec = [taste.sweet, taste.salty, taste.bitter, taste.spicy, taste.umami, taste.overall]
        db_vec = [
            record.get("sweet") or 50,
            record.get("salty") or 50,
            record.get("bitter") or 50,
            record.get("spicy") or 50,
            record.get("umami") or 50,
            record.get("overall") or 50,
        ]
        vectors.append(vec)
        vectors.append(db_vec)
        weights.append(1.0)

    # 香りベクトル（重み: 0.7）
    if aroma:
        vec = [aroma.intensity]
        db_vec = [record.get("aroma_intensity") or 50]
        vectors.append(vec)
        vectors.append(db_vec)
        weights.append(0.7)

    # 食感ベクトル（重み: 0.7）
    if texture:
        vec = [texture.intensity]
        db_vec = [record.get("texture_intensity") or 50]
        vectors.append(vec)
        vectors.append(db_vec)
        weights.append(0.7)

    # 用途プロファイル（重み: 0.8）
    if function:
        vec = [function.thickener, function.sweetener, function.souring_agent,
               function.umami_booster, function.aromatic_base, function.fat_source]
        # taste_profiles テーブルから取得する必要がある（ここでは省略）
        # PoC では類似度計算に含めない

    # 栄養プロファイル（重み: 0.8）
    if nutrition:
        vec = [nutrition.high_fat, nutrition.high_protein, nutrition.high_carb,
               nutrition.fiber_rich, nutrition.vitamin_rich, nutrition.low_calorie]
        # taste_profiles テーブルから取得する必要がある（ここでは省略）
        # PoC では類似度計算に含めない

    if not vectors:
        return 0.0

    # 重み付きコサイン類似度の平均
    total_weight = sum(weights)
    weighted_similarities = []

    for i in range(0, len(vectors), 2):
        if i + 1 < len(vectors):
            sim = cosine_similarity(vectors[i], vectors[i + 1])
            # [0, 1] に正規化（cosine は [-1, 1]）
            normalized_sim = (sim + 1) / 2
            w_idx = i // 2
            if w_idx < len(weights):
                weighted_similarities.append(normalized_sim * weights[w_idx])

    if not weighted_similarities:
        return 0.0

    return sum(weighted_similarities) / total_weight
