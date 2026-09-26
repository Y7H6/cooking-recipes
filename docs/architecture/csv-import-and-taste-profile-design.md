# CSVレシピインポート・Epicureマッピング・味プロファイル設計

**作成日:** 2026-09-26  
**対象:** Recipes1M CSV（約223万行）のインポート、ingredients正規化、Epicure vocabマッピング、味・香り・食感プロファイル計算  
**関連:** [`taste-evaluation-design.md`](taste-evaluation-design.md) / [`technical-architecture.md`](technical-architecture.md)

---

## 1. CSVファイル構造（確認済み）

### 1.1 ファイル情報

| 項目 | 値 |
|------|-----|
| ファイルパス | `backend/data/Data.csv` |
| ファイルサイズ | 約2.3 GB |
| 行数 | 約2,231,142行（0〜2,231,141） |
| ソース | [Hugging Face Datasets/CodeKapital/CookingRecipes](https://huggingface.co/datasets/CodeKapital/CookingRecipes/tree/main) |

### 1.2 カラム構造

| インデックス | カラム名 | 型 | 説明 |
|-------------|----------|-----|------|
| 0 | `Unnamed: 0` | int | CSVインデックス（無視） |
| 1 | `title` | str | レシピタイトル |
| 2 | `ingredients` | JSON配列 | 材料リスト（分量付き文字列） |
| 3 | `directions` | JSON配列 | 作り方ステップ |
| 4 | `link` | str | オリジナルURL |
| 5 | `source` | str | データソース名（例: `Recipes1M`, `cookpad.com`） |
| 6 | `NER` | JSON配列 | NERで抽出された食材名リスト |

### 1.3 ingredients カラムの形式

```json
["1 c. firmly packed brown sugar", "1/2 c. evaporated milk", "1/2 tsp. vanilla", "1/2 c. broken nuts (pecans)", "2 Tbsp. butter or margarine", "3 1/2 c. bite size shredded rice biscuits"]
```

**特徴:**
- 分量（`1 c.`）と単位（`Tbsp.`）が食材名に混在
- 括弧内の補足情報あり（例: `broken nuts (pecans)`）
- `or` による代替表記あり（例: `butter or margarine`）

---

## 2. システム構成図

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CSVインポートパイプライン                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │ Data.csv │───▶│ 正規化エンジン │───▶│ Epicureマッ  │              │
│  │ (2.3GB)  │    │ (ingredients) │    │ ピング       │              │
│  └──────────┘    └──────────────┘    └──────┬───────┘              │
│                                              │                       │
│                              ┌───────────────▼───────────────┐      │
│                              │   taste_profile_service       │      │
│                              │   (味・香り・食感プロファイル)  │      │
│                              └───────────────┬───────────────┘      │
│                                              │                       │
│                              ┌───────────────▼───────────────┐      │
│                              │   PostgreSQL (recipes DB)     │      │
│                              └───────────────────────────────┘      │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                     Epicure データソース                             │
│  vocab.csv (1,791食材) ── epicure_core.csv (300次元)               │
│  epicure_cooc.csv (300次元) ── epicure_chem.csv (300次元)          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. ディレクトリ構造と責務分離

```
backend/
├── app/
│   ├── services/
│   │   ├── csv_import_service.py    # CSVインポートのオーケストレーション
│   │   ├── ingredient_normalizer.py # ingredients正規化エンジン
│   │   ├── epicure_mapper.py        # Epicure vocabマッピング
│   │   ├── taste_profile_service.py # 味・香り・食感プロファイル計算
│   │   └── __init__.py
│   ├── models/
│   │   ├── recipe.py                # recipes テーブルORM
│   │   ├── recipe_ingredient.py     # recipe_ingredients テーブルORM
│   │   └── taste_profile.py         # taste_profiles テーブルORM（新規）
│   └── routers/
│       └── import_router.py         # インポートAPIエンドポイント
├── data/
│   ├── Data.csv                     # Recipes1M CSV（2.3GB）
│   ├── epicure_core.csv             # Epicure coreベクトル
│   ├── epicure_cooc.csv             # Epicure coocベクトル
│   ├── epicure_chem.csv             # Epicure chemベクトル
│   ├── vocab.csv                    # 食材マスタ（1,791食材）
│   ├── ingredient_synonyms.json     # 同義語マッピング表
│   └── cuisine_ingredients.json     # 文化別代表食材（既存設計§13.2参照）
├── alembic/
│   └── versions/                    # マイグレーションファイル
└── tests/
    └── test_csv_import.py           # インポートテスト
```

---

## 4. ingredients 正規化設計

### 4.1 正規化の目的

CSVの`ingredients`カラムは分量・単位・補足情報が混在しているため、Epicure vocabと一致させるために以下の正規化を行う:

1. **lowercase**: 大文字を小文字に変換
2. **underscore**: スペースをアンダースコアに変換（例: `olive oil` → `olive_oil`）
3. **同義語処理**: 代替表記を標準名に変換（例: `butter or margarine` → `butter`）
4. **分量除去**: 数値・単位を除去（例: `1 c. firmly packed brown sugar` → `brown sugar`）
5. **括弧内処理**: 補足情報を抽出・統合

### 4.2 正規化エンジン（ingredient_normalizer.py）

```python
# backend/app/services/ingredient_normalizer.py

import re
import json
from dataclasses import dataclass

@dataclass
class NormalizedIngredient:
    """正規化された食材"""
    name_en: str          # 標準食材名（lowercase, underscore）
    name_ja: str | None   # 日本語食材名（任意）
    amount: float | None  # 分量（数値のみ）
    unit: str | None      # 単位（g, ml, c., Tbsp. 等）
    epicure_node_id: int | None  # Epicure vocabのnode_id（マッピング後）

class IngredientNormalizer:
    """ingredients正規化エンジン"""

    # 分量・単位の正規化パターン
    AMOUNT_PATTERN = re.compile(r'^([\d./]+)\s*(.+)$')
    UNIT_MAP = {
        'c.': 'cup', 'tbsp': 'tablespoon', 'tsp': 'teaspoon',
        'oz': 'ounce', 'lb': 'pound', 'kg': 'kilogram',
        'g': 'gram', 'ml': 'milliliter', 'l': 'liter',
    }

    def __init__(self, synonyms_path: str = "backend/data/ingredient_synonyms.json"):
        self.synonyms = self._load_synonyms(synonyms_path)

    def normalize(self, raw_ingredient: str) -> NormalizedIngredient:
        """単一食材の正規化"""
        # 1. lowercase
        text = raw_ingredient.lower().strip()

        # 2. 分量抽出
        amount, unit, name = self._extract_amount(text)

        # 3. 同義語処理
        name = self._resolve_synonyms(name)

        # 4. underscore変換
        name_en = name.replace(' ', '_')

        # 5. 括弧内処理（補足食材として記録）
        #    例: "broken nuts (pecans)" → name="nuts", supplement=["pecans"]

        return NormalizedIngredient(
            name_en=name_en,
            name_ja=None,  # NERカラムまたは後工程で設定
            amount=amount,
            unit=unit,
            epicure_node_id=None,  # マッピング後
        )

    def normalize_batch(self, raw_ingredients: list[str]) -> list[NormalizedIngredient]:
        """バッチ正規化"""
        return [self.normalize(ing) for ing in raw_ingredients]

    def _extract_amount(self, text: str) -> tuple[float | None, str | None, str]:
        """分量・単位・食材名を抽出"""
        # 例: "1 c. firmly packed brown sugar" → (1.0, "cup", "firmly packed brown sugar")
        match = self.AMOUNT_PATTERN.match(text)
        if match:
            amount_str, rest = match.groups()
            # 分数処理（例: "1/2" → 0.5）
            amount = self._parse_fraction(amount_str)
            unit = self._extract_unit(rest)
            name = rest.replace(unit, '').strip() if unit else rest
            return amount, unit, name
        return None, None, text

    def _parse_fraction(self, frac: str) -> float | None:
        """分数を浮動小数点に変換"""
        # 例: "1/2" → 0.5, "3 1/2" → 3.5
        if '/' in frac:
            parts = frac.split('/')
            return float(parts[0]) / float(parts[1])
        try:
            return float(frac)
        except ValueError:
            return None

    def _extract_unit(self, text: str) -> str | None:
        """単位を抽出"""
        for short, full in self.UNIT_MAP.items():
            if short in text or full in text:
                return full
        return None

    def _resolve_synonyms(self, name: str) -> str:
        """同義語を標準名に変換"""
        # 例: "butter or margarine" → "butter"
        #     "chicken thighs" → "chicken_thigh"
        for alias, standard in self.synonyms.items():
            if alias in name:
                return standard
        return name

    def _load_synonyms(self, path: str) -> dict[str, str]:
        """同義語マッピング表の読み込み"""
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
```

### 4.3 同義語マッピング表（ingredient_synonyms.json）

```json
{
    "butter or margarine": "butter",
    "margarine": "butter",
    "chicken thighs": "chicken_thigh",
    "chicken breast": "chicken_breast",
    "ground beef": "ground_beef",
    "extra lean ground beef": "ground_beef",
    "cream of mushroom soup": "mushroom_soup",
    "sour cream": "sour_cream",
    "powdered sugar": "powdered_sugar",
    "confectioners sugar": "powdered_sugar",
    "all-purpose flour": "flour",
    "self rising flour": "flour",
    "green onion": "scallion",
    "scallions": "scallion",
    "bell pepper": "bell_pepper",
    "green pepper": "bell_pepper",
    "red pepper": "bell_pepper",
    "chocolate chips": "chocolate_chip",
    "semi-sweet chocolate chips": "chocolate_chip",
    "cream cheese": "cream_cheese",
    "graham cracker crumbs": "graham_cracker",
    "graham cracker crust": "graham_cracker",
    "pineapple, drained": "pineapple",
    "crushed pineapple": "pineapple",
    "diced tomato": "tomato",
    "chopped onion": "onion",
    "minced garlic": "garlic",
    "fresh strawberry": "strawberry",
    "frozen strawberry": "strawberry",
    "sweet potato": "sweet_potato",
    "yams": "sweet_potato",
    "eggplant": "aubergine",
    "zucchini": "courgette",
    "aubergine": "eggplant",
    "courgette": "zucchini"
}
```

> **設計判断:** 同義語マッピングはデータファイル（JSON）で管理し、コードハードコードを避ける。PoCでは50〜100ペアから開始し、実装中に追加する。

---

## 5. Epicure vocab マッピング設計

### 5.1 マッピングフロー

```
NormalizedIngredient.name_en
        │
        ▼
┌──────────────────┐     不一致      ┌──────────────┐
│  vocab.csv 照合  │─── 一致 ───▶  epicure_node_id │
│  (name → node_id)│                └──────────────┘
└────────┬─────────┘
         │ 不一致
         ▼
┌──────────────────┐
│  Fuzzy Match     │
│  (Levenshtein)   │
└────────┬─────────┘
         │ 一致確率 > 閾値
         ▼
   epicure_node_id（確信度付き）
         │ 未満
         ▼
   epicure_node_id = NULL
   （Jev評価には影響しない）
```

### 5.2 Epicure Mapper（epicure_mapper.py）

```python
# backend/app/services/epicure_mapper.py

import csv
import json
from pathlib import Path
from dataclasses import dataclass
from rapidfuzz import fuzz

@dataclass
class MappingResult:
    """マッピング結果"""
    name_en: str
    epicure_node_id: int | None
    confidence: float  # 0.0〜1.0
    match_type: str   # "exact" / "fuzzy" / "none"

class EpicureMapper:
    """Epicure vocabへの食材マッピング"""

    def __init__(self, vocab_path: str = "backend/data/vocab.csv",
                 core_path: str = "backend/data/epicure_core.csv"):
        self.vocab = self._load_vocab(vocab_path)
        self.vectors = self._load_vectors(core_path)
        self.name_to_node = {name: node_id for name, node_id in self.vocab.items()}

    def map(self, name_en: str) -> MappingResult:
        """単一食材のマッピング"""
        # 1. 完全一致
        if name_en in self.name_to_node:
            return MappingResult(
                name_en=name_en,
                epicure_node_id=self.name_to_node[name_en],
                confidence=1.0,
                match_type="exact",
            )

        # 2. Fuzzy Match（閾値: 85）
        best_match = None
        best_score = 0
        for vocab_name, node_id in self.name_to_node.items():
            score = fuzz.ratio(name_en, vocab_name)
            if score > best_score and score >= 85:
                best_score = score
                best_match = (vocab_name, node_id)

        if best_match:
            return MappingResult(
                name_en=name_en,
                epicure_node_id=best_match[1],
                confidence=best_score / 100.0,
                match_type="fuzzy",
            )

        # 3. 不一致
        return MappingResult(
            name_en=name_en,
            epicure_node_id=None,
            confidence=0.0,
            match_type="none",
        )

    def map_batch(self, names: list[str]) -> list[MappingResult]:
        """バッチマッピング"""
        return [self.map(name) for name in names]

    def get_vector(self, node_id: int) -> list[float] | None:
        """食材のEpicureベクトル取得（core）"""
        return self.vectors.get(node_id)

    def _load_vocab(self, path: str) -> dict[str, int]:
        """vocab.csv読み込み（name → node_id）"""
        vocab = {}
        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                vocab[row['name']] = int(row['node_id_cooc'])
        return vocab

    def _load_vectors(self, path: str) -> dict[int, list[float]]:
        """epicure_core.csv読み込み（node_id → 300次元ベクトル）"""
        vectors = {}
        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                node_id = int(row['node_id'])
                vec = [float(row[f'dim_{i}']) for i in range(300)]
                vectors[node_id] = vec
        return vectors
```

### 5.3 依存関係

`rapidfuzz` を `pyproject.toml` に追加:

```toml
[project]
dependencies = [
    # ...既存...
    "rapidfuzz>=3.0.0",  # Fuzzy string matching
]
```

---

## 6. プロファイル計算設計（味・香り・食感）

### 6.1 味プロファイル計算

**方針:** Epicure coreベクトルを使用して、レシピの味空間表現を計算する。

```python
# backend/app/services/taste_profile_service.py

import numpy as np
from dataclasses import dataclass
from typing import list

@dataclass
class TasteProfile:
    """レシピの味プロファイル"""
    sweet: float       # 甘みスコア（0〜100）
    salty: float       # 塩味スコア（0〜100）
    bitter: float      # 苦みスコア（0〜100）
    spicy: float       # 辛みスコア（0〜100）
    umami: float       # うま味スコア（0〜100）
    overall: float     # 総合スコア（0〜100）
    confidence: float  # 信頼度（0〜1）

class TasteProfileService:
    """味プロファイル計算サービス"""

    def __init__(self, mapper: EpicureMapper):
        self.mapper = mapper

    def calculate(self, ingredients: list[NormalizedIngredient]) -> TasteProfile:
        """レシピの味プロファイルを計算"""
        # 1. 各食材のベクトル取得（Epicure core）
        vectors = []
        weights = []
        for ing in ingredients:
            if ing.epicure_node_id is not None:
                vec = self.mapper.get_vector(ing.epicure_node_id)
                if vec:
                    vectors.append(vec)
                    weights.append(ing.amount or 1.0)

        if not vectors:
            return TasteProfile(sweet=0, salty=0, bitter=0, spicy=0, umami=0, overall=0, confidence=0)

        # 2. 分量重み付きベクトル合成
        weighted_sum = np.average(vectors, axis=0, weights=weights)

        # 3. 味軸への射影（将来: PCA等）
        #    PoCではJev評価に依存（Epicure単体では味軸判定不可、§taste-evaluation-design.md §1.2参照）
        #    ここではベクトル合成結果をDBに保存し、Jev評価の補助コンテキストとして使用

        return TasteProfile(
            sweet=0, salty=0, bitter=0, spicy=0, umami=0, overall=0, confidence=0
            # PoC: Jev評価後にtaste_scoresテーブルに保存
        )
```

> **重要:** §taste-evaluation-design.md §1.2 で確認した通り、**Epicure 300次元ベクトルは潜在空間であり、味軸（甘み・塩味等）への直接射影は不可能**。したがって:
> 1. PoCではJev APIによる評価が主軸
> 2. Epicureベクトル合成結果は **類似度検索** のみに使用
> 3. 将来、人工ラベルデータが揃った後にPCA等で味軸射影を検証

### 6.2 香りプロファイル計算

**方針:** Epicure chemベクトルを使用して、香りの傾向を表現する。

```python
class AromaProfileService:
    """香りプロファイル計算サービス"""

    def __init__(self, mapper: EpicureMapper):
        self.mapper = mapper

    def calculate(self, ingredients: list[NormalizedIngredient]) -> dict[str, float]:
        """レシピの香りプロファイルを計算"""
        # 1. chemベクトル取得
        vectors = []
        weights = []
        for ing in ingredients:
            if ing.epicure_node_id is not None:
                vec = self.mapper.get_vector_by_type(ing.epicure_node_id, "chem")
                if vec:
                    vectors.append(vec)
                    weights.append(ing.amount or 1.0)

        if not vectors:
            return {}

        # 2. 分量重み付きベクトル合成
        weighted_sum = np.average(vectors, axis=0, weights=weights)

        # 3. 香り系統との類似度（§taste-evaluation-design.md §10参照）
        aroma_families = self._calculate_aroma_similarity(weighted_sum)
        return aroma_families

    def _calculate_aroma_similarity(self, vector: np.ndarray) -> dict[str, float]:
        """香り系統ごとの類似度を計算"""
        # 代表食材のchemベクトル重心を方向ベクトルとして使用
        # cosine類似度を[-1, 1] → [0, 100]に変換
        pass
```

### 6.3 食感プロファイル計算

**方針:** Epicure chemベクトルを使用して、食感の傾向を表現する。

```python
class TextureProfileService:
    """食感プロファイル計算サービス"""

    def __init__(self, mapper: EpicureMapper):
        self.mapper = mapper

    def calculate(self, ingredients: list[NormalizedIngredient]) -> dict[str, float]:
        """レシピの食感プロファイルを計算"""
        # 1. chemベクトル取得（ゲル化剤・澱粉・豆腐等）
        vectors = []
        weights = []
        for ing in ingredients:
            if ing.epicure_node_id is not None:
                vec = self.mapper.get_vector_by_type(ing.epicure_node_id, "chem")
                if vec:
                    vectors.append(vec)
                    weights.append(ing.amount or 1.0)

        if not vectors:
            return {}

        # 2. 食感系統ごとの類似度（§taste-evaluation-design.md §11参照）
        texture_families = self._calculate_texture_similarity(vectors, weights)
        return texture_families
```

---

## 7. DB設計

### 7.1 recipes テーブル（既存設計からの拡張）

| 列 | 型 | 説明 |
|----|----|------|
| `id` | SERIAL PK | |
| `user_id` | INT | ユーザーID（PoC: ローカルストレージから取得、簡易版） |
| `parent_recipe_id` | INT FK | 親レシピID（バージョン管理用、NULL=新規） |
| `is_deleted` | BOOLEAN DEFAULT FALSE | 論理削除フラグ |
| `title_ja` | TEXT NOT NULL | 日本語タイトル（CSV title → Qwen翻訳） |
| `title_en` | TEXT NOT NULL | 英語タイトル（CSV title → Qwen翻訳） |
| `instructions_ja` | TEXT | 日本語作り方（CSV directions → Qwen翻訳） |
| `instructions_en` | TEXT | 英語作り方（CSV directions → Qwen翻訳） |
| `genre` | TEXT | 料理文化（japanese/chinese/...） |
| `source` | TEXT | データソース（`Recipes1M`, `cookpad.com` 等） |
| `original_link` | TEXT | オリジナルURL |
| `is_favorite` | BOOLEAN | お気に入りフラグ |
| `comment` | TEXT | コメント（最大500文字） |
| `comment_updated_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | インポート日時 |
| `updated_at` | TIMESTAMPTZ | |

> **設計判断:**
> - `user_id`: PoCでは簡易版（ローカルストレージにuser_id保存）。本番では認証サーバー連携。
> - `parent_recipe_id`: ユーザーがレシピを編集した場合、新規IDで保存し親レシピIDを記録。最大10回分まで表示。
> - `is_deleted`: 論理削除。検索時に `WHERE is_deleted = FALSE` でフィルタ。

### 7.2 recipe_ingredients テーブル（既存設計からの拡張）

| 列 | 型 | 説明 |
|----|----|------|
| `id` | SERIAL PK | |
| `recipe_id` | INT FK | |
| `name_ja` | TEXT | 日本語食材名 |
| `name_en` | TEXT NOT NULL | 英語食材名（正規化後） |
| `amount` | NUMERIC | 分量（数値のみ） |
| `unit` | TEXT | 単位（cup, tablespoon, gram 等） |
| `epicure_node_id` | INT | Epicure vocabのnode_id（NULL可） |
| `mapping_confidence` | REAL | マッピング確信度（0〜1） |
| `mapping_type` | TEXT | マッチタイプ（exact/fuzzy/none） |

### 7.3 taste_profiles テーブル（新規）

> **注意:** taste_scores（Jev評価結果）とは別に、Epicureベースの味プロファイルを保存する。

| 列 | 型 | 説明 |
|----|----|------|
| `id` | SERIAL PK | |
| `recipe_id` | INT FK | |
| `taste_json` | JSONB | Epicureベクトル合成結果（味空間座標） |
| `aroma_json` | JSONB | 香りプロファイル（系統ごとの類似度） |
| `texture_json` | JSONB | 食感プロファイル（系統ごとの類似度） |
| `function_profile_json` | JSONB | 用途プロファイル（§taste-evaluation-design.md §14参照） |
| `nutrition_profile_json` | JSONB | 栄養プロファイル（§taste-evaluation-design.md §15参照） |
| `calculated_at` | TIMESTAMPTZ | 計算日時 |

> **設計判断:** taste_scores（Jev評価結果）とは別に taste_profiles テーブルを新規作成する。理由は:
> 1. Jev評価は外部API依存（レイテンシ・コスト・可用性の問題）
> 2. Epicureプロファイルは決定論的に再計算可能（オンザフライ計算も可）
> 3. PoCではEpicureプロファイルを先に計算し、Jev評価は後続フェーズ

### 7.4 taste_scores テーブル（新規 - Jev評価結果）

[`taste-evaluation-design.md`](../architecture/taste-evaluation-design.md) §4.3 に基づく。

| 列 | 型 | 説明 |
|----|----|------|
| `id` | SERIAL PK | |
| `recipe_id` | INT FK | recipes.id 外部キー |
| `sweet` | SMALLINT | 甘さ（0〜100） |
| `salty` | SMALLINT | 塩味（0〜100） |
| `bitter` | SMALLINT | 苦味（0〜100） |
| `spicy` | SMALLINT | 辛味（0〜100） |
| `umami` | SMALLINT | うま味（0〜100） |
| `overall` | SMALLINT | 総合（0〜100） |
| `confidence` | REAL | 信頼度（0.0〜1.0） |
| `aroma_intensity` | SMALLINT | 香りの強度（0〜100） |
| `aroma_family` | TEXT | 香り系統（herbal/spice/citrus/nutty/smoky/fermented/floral/none） |
| `texture_intensity` | SMALLINT | 食感の強度（0〜100） |
| `texture_profile` | TEXT | 食感系統（crispy/chewy/tender/creamy/juicy/crunchy/fluffy/none） |
| `raw_json` | JSONB | Jev生レスポンス（デバッグ用） |
| `evaluated_at` | TIMESTAMPTZ | 評価日時 |

#### インデックス

```sql
-- 味軸ごとのインデックス（ランキング・フィルタ用）
CREATE INDEX idx_taste_scores_sweet ON taste_scores (sweet);
CREATE INDEX idx_taste_scores_salty ON taste_scores (salty);
CREATE INDEX idx_taste_scores_bitter ON taste_scores (bitter);
CREATE INDEX idx_taste_scores_spicy ON taste_scores (spicy);
CREATE INDEX idx_taste_scores_umami ON taste_scores (umami);
CREATE INDEX idx_taste_scores_overall ON taste_scores (overall);

-- 香り軸のインデックス
CREATE INDEX idx_taste_scores_aroma_intensity ON taste_scores (aroma_intensity);
CREATE INDEX idx_taste_scores_aroma_family ON taste_scores (aroma_family);

-- 食感軸のインデックス
CREATE INDEX idx_taste_scores_texture_intensity ON taste_scores (texture_intensity);
CREATE INDEX idx_taste_scores_texture_profile ON taste_scores (texture_profile);

-- 複合インデックス（複数軸フィルタ用）
CREATE INDEX idx_taste_scores_overall_conf ON taste_scores (overall, confidence);
```

> **設計判断:**
> - `taste_scores` は Jev 評価結果を保存。レシピ編集時は新規レコードとして保存（上書きしない）。
> - `raw_json` はデバッグ用。本番では不要な場合は削除可能。

---

## 8. CSVインポートサービス設計

### 8.1 csv_import_service.py

```python
# backend/app/services/csv_import_service.py

import csv
import json
from pathlib import Path
from typing import list
from sqlalchemy.orm import Session

from .ingredient_normalizer import IngredientNormalizer, NormalizedIngredient
from .epicure_mapper import EpicureMapper, MappingResult
from .taste_profile_service import TasteProfileService, AromaProfileService, TextureProfileService
from ..models.recipe import Recipe
from ..models.recipe_ingredient import RecipeIngredient
from ..models.taste_profile import TasteProfile

class CsvImportService:
    """CSVレシピインポートサービス"""

    def __init__(self, db: Session):
        self.db = db
        self.normalizer = IngredientNormalizer()
        self.mapper = EpicureMapper()
        self.taste_service = TasteProfileService(self.mapper)
        self.aroma_service = AromaProfileService(self.mapper)
        self.texture_service = TextureProfileService(self.mapper)

    def import_csv(self, csv_path: str, batch_size: int = 1000) -> dict:
        """CSVファイルをバッチインポート"""
        imported_count = 0
        skipped_count = 0
        mapping_errors = 0

        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            batch = []

            for row in reader:
                try:
                    recipe = self._parse_row(row)
                    batch.append(recipe)

                    if len(batch) >= batch_size:
                        self._flush_batch(batch)
                        imported_count += len(batch)
                        batch = []

                except Exception as e:
                    skipped_count += 1
                    continue

            # 残りバッチ処理
            if batch:
                self._flush_batch(batch)
                imported_count += len(batch)

        return {
            "imported": imported_count,
            "skipped": skipped_count,
            "mapping_errors": mapping_errors,
        }

    def _parse_row(self, row: dict) -> Recipe:
        """CSV行をRecipeオブジェクトに変換"""
        # 1. タイトル（英語）
        title_en = row['title'].strip()

        # 2. ingredients正規化
        raw_ingredients = json.loads(row['ingredients'])
        normalized = self.normalizer.normalize_batch(raw_ingredients)

        # 3. Epicureマッピング
        mapped = self.mapper.map_batch([ing.name_en for ing in normalized])
        for ing, result in zip(normalized, mapped):
            ing.epicure_node_id = result.epicure_node_id
            # DB保存時にmapping_confidence, mapping_typeも記録

        # 4. レシピオブジェクト作成
        recipe = Recipe(
            title_en=title_en,
            title_ja=None,  # Qwen翻訳は後工程
            instructions_en=json.dumps(json.loads(row['directions'])),
            instructions_ja=None,  # Qwen翻訳は後工程
            source=row['source'],
            original_link=row['link'],
        )

        # 5. 食材オブジェクト作成
        for ing in normalized:
            recipe_ingredient = RecipeIngredient(
                recipe=recipe,
                name_en=ing.name_en,
                amount=ing.amount,
                unit=ing.unit,
                epicure_node_id=ing.epicure_node_id,
            )
            self.db.add(recipe_ingredient)

        # 6. taste_profiles計算（Epicureベース）
        taste_profile = TasteProfile(
            recipe=recipe,
            taste_json=self._serialize_taste(self.taste_service.calculate(normalized)),
            aroma_json=self._serialize_aroma(self.aroma_service.calculate(normalized)),
            texture_json=self._serialize_texture(self.texture_service.calculate(normalized)),
        )
        self.db.add(taste_profile)

        return recipe

    def _flush_batch(self, batch: list[Recipe]):
        """バッチをDBにフラッシュ"""
        self.db.flush()  # ID割り当て
        self.db.commit()

    def _serialize_taste(self, profile) -> str:
        """味プロファイルをJSON文字列に変換"""
        return json.dumps({
            'sweet': profile.sweet,
            'salty': profile.salty,
            'bitter': profile.bitter,
            'spicy': profile.spicy,
            'umami': profile.umami,
            'overall': profile.overall,
        })

    def _serialize_aroma(self, profile) -> str:
        """香りプロファイルをJSON文字列に変換"""
        return json.dumps(profile)

    def _serialize_texture(self, profile) -> str:
        """食感プロファイルをJSON文字列に変換"""
        return json.dumps(profile)
```

### 8.2 インポートAPIエンドポイント

```python
# backend/app/routers/import_router.py

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from ..services.csv_import_service import CsvImportService
from ..core.db import get_db

router = APIRouter(prefix="/api/import", tags=["import"])

class ImportRequest(BaseModel):
    csv_path: str
    batch_size: int = 1000

@router.post("/recipes")
def import_recipes(
    request: ImportRequest,
    background_tasks: BackgroundTasks,
    db = get_db(),
):
    """CSVレシピインポート（バックグラウンド処理）"""
    def _import():
        service = CsvImportService(db)
        result = service.import_csv(request.csv_path, request.batch_size)
        return result

    background_tasks.add_task(_import)
    return {"status": "started", "message": "インポートを開始しました"}
```

---

## 9. セキュリティ・運用上の考慮

| 項目 | 対応 |
|------|------|
| CSVファイルサイズ | 2.3GBのため、バッチ処理（1,000行/バッチ）でメモリ使用量を抑制 |
| マッピング失敗 | `epicure_node_id = NULL` でJev評価に影響しない（§taste-evaluation-design.md §4.2参照） |
| Fuzzy Match閾値 | 85/100で設定。低すぎる場合、誤マッピングのリスクがある |
| 同義語マッピング | JSONファイルで管理。ハードコード禁止（AGENTS.md §3.3参照） |
| DBインデックス | `recipe_ingredients.epicure_node_id` にインデックス追加を推奨 |
| インポート再開 | チェックポイント機能を実装（既にインポートしたrow_idから再開） |
| データ整合性 | Epicure CSV更新時はマッピング表も再実行 |

---

## 10. スケーリング考慮

### 10.1 223万行の処理見積もり

| 項目 | 見積もり |
|------|---------|
| インポート時間 | 約30〜60分（バッチ1,000行、DBコミット頻度による） |
| メモリ使用量 | 約2〜4GB（バッチサイズに依存） |
| DBストレージ | 約50〜100GB（recipes + recipe_ingredients + taste_profiles） |

### 10.2 パフォーマンス最適化案

| 案 | 説明 | 優先度 |
|----|------|--------|
| COPYコマンド使用 | psycopg2のCOPYで一括インポート | 高 |
| マッピングキャッシュ | 既マッピング食材をRedis/ファイルにキャッシュ | 中 |
| バッチサイズ調整 | メモリ状況に応じて動的に調整 | 低 |
| 並列処理 | 行単位で並列（DBロックに注意） | 低 |

---

## 11. 未確定事項（要確認）

1. **CSVのsourceカラム:** `Recipes1M`, `cookpad.com` 等の値が複数種類ある。フィルタリングが必要か？
2. **title_ja / instructions_ja の翻訳:** Qwenで翻訳するか、既存データがあればそれを使用するか。
3. **taste_profiles vs taste_scores:** EpicureベースのプロファイルとJev評価結果の使い分けを明確化。
4. **インデックス戦略:** `recipe_ingredients.epicure_node_id` にインデックスを追加するか。
5. **同義語マッピングの拡張:** 50〜100ペアから開始。自動拡張の方針は？

---

## 12. 実装フェーズ（推奨）

| フェーズ | 内容 | 依存 |
|----------|------|------|
| 1 | `ingredient_normalizer.py`（正規化エンジン） | なし |
| 2 | `epicure_mapper.py`（Epicureマッピング） | フェーズ1 |
| 3 | `taste_profile_service.py`（プロファイル計算） | フェーズ2 |
| 4 | `csv_import_service.py`（インポートオーケストレーション） | フェーズ1〜3 |
| 5 | DBマイグレーション（recipes, recipe_ingredients, taste_profiles） | なし |
| 6 | インポートAPIエンドポイント | フェーズ4 |
| 7 | テスト（正規化・マッピング・インポート） | フェーズ5〜6 |

---

## 13. 関連ドキュメント

- [`taste-evaluation-design.md`](taste-evaluation-design.md) - Jev評価設計
- [`technical-architecture.md`](technical-architecture.md) - 技術アーキテクチャ
- [`data-flow-graph.md`](data-flow-graph.md) - データフロー図
- [`api-spec-details.md`](../api/api-spec-details.md) - API仕様
