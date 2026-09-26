# backend/tests/test_taste_search_service.py

"""taste_search_service.py のユニットテスト。

- cosine_similarity 関数のテスト
- search_by_taste, get_ranking のロジックテスト（モック DB 使用）
"""

import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session

from app.services.taste_search_service import (
    TasteVector,
    AromaVector,
    TextureVector,
    FunctionVector,
    NutritionVector,
    cosine_similarity,
    search_by_taste,
    get_ranking,
)


# ---------------------------------------------------------------------------
# cosine_similarity テスト
# ---------------------------------------------------------------------------


class TestCosineSimilarity:
    """cosine_similarity 関数のテスト"""

    def test_identical_vectors(self) -> None:
        """同一ベクトルは類似度 1.0"""
        v1 = [1.0, 0.0, 0.0]
        v2 = [1.0, 0.0, 0.0]
        assert cosine_similarity(v1, v2) == pytest.approx(1.0)

    def test_orthogonal_vectors(self) -> None:
        """直交ベクトルは類似度 0.0"""
        v1 = [1.0, 0.0]
        v2 = [0.0, 1.0]
        assert cosine_similarity(v1, v2) == pytest.approx(0.0)

    def test_opposite_vectors(self) -> None:
        """反対ベクトルは類似度 -1.0"""
        v1 = [1.0, 0.0]
        v2 = [-1.0, 0.0]
        assert cosine_similarity(v1, v2) == pytest.approx(-1.0)

    def test_zero_vector(self) -> None:
        """ゼロベクトルは類似度 0.0"""
        v1 = [0.0, 0.0]
        v2 = [1.0, 1.0]
        assert cosine_similarity(v1, v2) == pytest.approx(0.0)

    def test_different_lengths(self) -> None:
        """異なる長さのベクトルは類似度 0.0（警告付き）"""
        v1 = [1.0, 2.0, 3.0]
        v2 = [1.0, 2.0]
        assert cosine_similarity(v1, v2) == pytest.approx(0.0)

    def test_scaled_vectors(self) -> None:
        """スケーリングされたベクトルは類似度 1.0"""
        v1 = [1.0, 2.0, 3.0]
        v2 = [2.0, 4.0, 6.0]
        assert cosine_similarity(v1, v2) == pytest.approx(1.0)


# ---------------------------------------------------------------------------
# search_by_taste テスト
# ---------------------------------------------------------------------------


class TestSearchByTaste:
    """search_by_taste 関数のテスト"""

    @pytest.fixture
    def mock_db(self) -> MagicMock:
        """モック DB セッション"""
        db = MagicMock(spec=Session)

        # モック結果を準備
        mock_row = MagicMock()
        mock_row.__iter__ = lambda self: iter([
            1,       # id
            101,     # recipe_id
            "和風カレー",  # recipe_title
            60,      # sweet
            40,      # salty
            10,      # bitter
            70,      # spicy
            80,      # umami
            75,      # overall
            0.85,    # confidence
            65,      # aroma_intensity
            "spice", # aroma_family
            50,      # texture_intensity
            "tender",# texture_profile
            None,    # raw_json
            None,    # evaluated_at
        ])
        mock_row.__len__ = lambda self: 16

        db.execute.return_value.fetchall.return_value = [mock_row]

        return db

    def test_search_with_taste_vector(self, mock_db: MagicMock) -> None:
        """味覚ベクトル指定で検索"""
        taste = TasteVector(
            sweet=60.0, salty=40.0, bitter=10.0,
            spicy=70.0, umami=80.0, overall=75.0,
        )

        result = search_by_taste(
            db=mock_db,
            taste=taste,
            sort_by="overall",
            sort_order="desc",
            limit=10,
            offset=0,
        )

        assert "results" in result
        assert "total" in result
        assert "search_params" in result
        assert result["total"] == 1
        assert len(result["results"]) == 1
        assert result["results"][0]["recipe_id"] == 101
        assert result["results"][0]["title"] == "和風カレー"

    def test_search_with_min_confidence(self, mock_db: MagicMock) -> None:
        """min_confidence フィルタが適用される"""
        taste = TasteVector()

        search_by_taste(
            db=mock_db,
            taste=taste,
            min_confidence=0.5,
            limit=10,
            offset=0,
        )

        # WHERE 句に confidence フィルタが含まれていることを確認
        call_args = mock_db.execute.call_args
        assert "min_confidence" in str(call_args)

    def test_search_with_invalid_sort_order(self, mock_db: MagicMock) -> None:
        """無効な sort_order は ValueError を発生"""
        with pytest.raises(ValueError, match="sort_order must be"):
            search_by_taste(
                db=mock_db,
                sort_by="overall",
                sort_order="invalid",
            )

    def test_search_with_all_vectors(self, mock_db: MagicMock) -> None:
        """全チャート指定で検索"""
        taste = TasteVector(sweet=60.0, salty=40.0, bitter=10.0, spicy=70.0, umami=80.0, overall=75.0)
        aroma = AromaVector(intensity=65.0, family="spice")
        texture = TextureVector(intensity=50.0, profile="tender")

        result = search_by_taste(
            db=mock_db,
            taste=taste,
            aroma=aroma,
            texture=texture,
            sort_by="overall",
            sort_order="desc",
            limit=10,
            offset=0,
        )

        assert result["total"] == 1
        assert "taste" in result["search_params"]
        assert "aroma" in result["search_params"]
        assert "texture" in result["search_params"]


# ---------------------------------------------------------------------------
# get_ranking テスト
# ---------------------------------------------------------------------------


class TestGetRanking:
    """get_ranking 関数のテスト"""

    @pytest.fixture
    def mock_db(self) -> MagicMock:
        """モック DB セッション"""
        db = MagicMock(spec=Session)

        mock_row = MagicMock()
        mock_row.__iter__ = lambda self: iter([
            101,     # recipe_id
            "和風カレー",  # recipe_title
            "japanese", # genre
            False,   # is_favorite
            60,      # sweet
            40,      # salty
            10,      # bitter
            70,      # spicy
            80,      # umami
            75,      # overall
            0.85,    # confidence
            65,      # aroma_intensity
            "spice", # aroma_family
            50,      # texture_intensity
            "tender",# texture_profile
        ])
        mock_row.__len__ = lambda self: 15

        db.execute.return_value.fetchall.return_value = [mock_row]

        return db

    def test_ranking_by_umami(self, mock_db: MagicMock) -> None:
        """うま味でソート"""
        result = get_ranking(
            db=mock_db,
            sort_by="umami",
            sort_order="desc",
            limit=10,
            offset=0,
        )

        assert "ranking" in result
        assert "total" in result
        assert "sort_by" in result
        assert result["sort_by"] == "umami"
        assert result["sort_order"] == "desc"
        assert result["ranking"][0]["score"] == 80

    def test_ranking_with_filters(self, mock_db: MagicMock) -> None:
        """フィルタ条件が適用される"""
        result = get_ranking(
            db=mock_db,
            sort_by="overall",
            sort_order="desc",
            filters={"min_confidence": 0.5, "aroma_family": "spice"},
            limit=10,
            offset=0,
        )

        assert result["total"] == 1

    def test_ranking_invalid_sort_order(self, mock_db: MagicMock) -> None:
        """無効な sort_order は ValueError を発生"""
        with pytest.raises(ValueError, match="sort_order must be"):
            get_ranking(
                db=mock_db,
                sort_by="overall",
                sort_order="invalid",
            )

    def test_ranking_asc_order(self, mock_db: MagicMock) -> None:
        """昇順ソート"""
        result = get_ranking(
            db=mock_db,
            sort_by="sweet",
            sort_order="asc",
            limit=10,
            offset=0,
        )

        assert result["sort_order"] == "asc"


# ---------------------------------------------------------------------------
# データクラス テスト
# ---------------------------------------------------------------------------


class TestDataClasses:
    """データクラスのテスト"""

    def test_taste_vector_defaults(self) -> None:
        """TasteVector のデフォルト値"""
        v = TasteVector()
        assert v.sweet == 50.0
        assert v.salty == 50.0
        assert v.bitter == 50.0
        assert v.spicy == 50.0
        assert v.umami == 50.0
        assert v.overall == 50.0

    def test_aroma_vector_defaults(self) -> None:
        """AromaVector のデフォルト値"""
        v = AromaVector()
        assert v.intensity == 50.0
        assert v.family is None

    def test_texture_vector_defaults(self) -> None:
        """TextureVector のデフォルト値"""
        v = TextureVector()
        assert v.intensity == 50.0
        assert v.profile is None

    def test_function_vector_defaults(self) -> None:
        """FunctionVector のデフォルト値"""
        v = FunctionVector()
        assert v.thickener == 50.0
        assert v.sweetener == 50.0
        assert v.souring_agent == 50.0
        assert v.umami_booster == 50.0
        assert v.aromatic_base == 50.0
        assert v.fat_source == 50.0

    def test_nutrition_vector_defaults(self) -> None:
        """NutritionVector のデフォルト値"""
        v = NutritionVector()
        assert v.high_fat == 50.0
        assert v.high_protein == 50.0
        assert v.high_carb == 50.0
        assert v.fiber_rich == 50.0
        assert v.vitamin_rich == 50.0
        assert v.low_calorie == 50.0
