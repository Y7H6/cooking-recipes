# **4. API リクエスト／レスポンス JSON 詳細仕様（完全版）**

以下は **追加機能すべてを含む** API 仕様です。

---

# **A. レシピ検索・取得系 API**

---

## **1. GET /api/recipes/search**
既存レシピをジャンル・キーワードで検索。キーワードはレシピ名・材料名・**コメント本文**を検索対象に含む。お気に入りフィルタに対応。

### Request（例）
```json
{
  "genre": "和食",
  "keyword": "カレー",
  "favorite_only": false
}
```

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `genre` | string | いいえ | ジャンル（和食・中華・洋食・スイーツ） |
| `keyword` | string | いいえ | キーワード（レシピ名・材料名・コメント本文を部分一致検索） |
| `favorite_only` | bool | いいえ | お気に入りレシピのみ返す（デフォルト: false） |

### Response
```json
{
  "recipes": [
    {
      "id": 101,
      "title": "和風カレー",
      "genre": "和食",
      "thumbnail": "/images/recipe_101.jpg",
      "is_favorite": true,
      "comment": "唐辛子を減らした方が好み"
    }
  ]
}
```

---

## **2. GET /api/recipes/{id}**
レシピ詳細取得。

### Response
```json
{
  "id": 101,
  "title": "和風カレー",
  "ingredients": [
    {"name": "鶏肉", "amount": 200},
    {"name": "玉ねぎ", "amount": 100},
    {"name": "醤油", "amount": 20}
  ],
  "instructions": "炒めてから煮込む",
  "is_favorite": true,
  "comment": "唐辛子を減らした方が好み",
  "taste_score": {
    "sweet": 40,
    "spicy": 60,
    "umami": 70,
    "overall": 68,
    "confidence": 0.82
  }
}
```

---

# **B. レシピ編集系 API（追加・削除・分量変更対応）**

---

## **3. POST /api/recipes/edit**
材料追加・削除・分量変更 → Jev で再評価。

### Request
```json
{
  "recipe_id": 101,
  "edits": [
    {"action": "add", "name": "唐辛子", "amount": 2},
    {"action": "remove", "name": "しょうが"},
    {"action": "update", "name": "砂糖", "amount": 15}
  ]
}
```

### Response
```json
{
  "updated_recipe": {
    "id": 101,
    "ingredients": [
      {"name": "鶏肉", "amount": 200},
      {"name": "玉ねぎ", "amount": 100},
      {"name": "醤油", "amount": 20},
      {"name": "砂糖", "amount": 15},
      {"name": "唐辛子", "amount": 2}
    ]
  },
  "taste_score": {
    "sweet": 45,
    "spicy": 75,
    "umami": 72,
    "overall": 70,
    "confidence": 0.80
  }
}
```

---

# **C. レシピ評価系 API（単発）**

---

## **4. POST /api/recipes/evaluate**
任意レシピを Jev で評価。

### Request
```json
{
  "ingredients": [
    {"name": "鶏肉", "amount": 200},
    {"name": "玉ねぎ", "amount": 100}
  ],
  "instructions": "炒めて煮込む"
}
```

### Response
```json
{
  "taste_score": {
    "sweet": 30,
    "spicy": 50,
    "salty": 40,
    "bitter": 10,
    "umami": 65,
    "overall": 62,
    "confidence": 0.78
  },
  "features": {
    "sweet_feature": 0.42,
    "spicy_feature": 0.12,
    "umami_feature": 0.78
  }
}
```

---

# **D. Qwen 補助レシピ生成（編集可能モード）**

---

## **5. POST /api/recipes/assist**
材料＋条件 → Qwen がレシピ案生成（編集可能）。

### Request
```json
{
  "ingredients": ["鶏肉", "玉ねぎ", "醤油"],
  "constraints": {
    "style": "和食",
    "spicy_level": "low",
    "time_limit": 30
  }
}
```

### Response
```json
{
  "generated_recipe": {
    "title": "和風鶏肉煮込み",
    "ingredients": [
      {"name": "鶏肉", "amount": 200},
      {"name": "玉ねぎ", "amount": 100},
      {"name": "醤油", "amount": 20},
      {"name": "みりん", "amount": 10}
    ],
    "instructions": "鶏肉と玉ねぎを炒め、醤油とみりんで煮込む。"
  }
}
```

---

# **E. バルク生成（ユーザー指定数のレシピ自動生成）**

---

## **6. POST /api/recipes/generate_bulk**
材料＋条件 → Qwen がユーザー指定数（最大10）のレシピを生成。

### Request
```json
{
  "ingredients": ["鶏肉", "玉ねぎ", "醤油", "砂糖"],
  "constraints": {
    "style": "和食",
    "variation": "high"
  },
  "count": 5
}
```

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `ingredients` | string[] | はい | 食材名リスト |
| `constraints` | object | いいえ | 制約条件（style, variation など） |
| `count` | int | いいえ | 生成数（1〜10, デフォルト: 1） |

### Response
```json
{
  "batch_id": "bulk_20260923_001",
  "count": 5
}
```

---

# **F. バルク評価（Jev）**

---

## **7. POST /api/recipes/evaluate_bulk**
バッチに属するレシピを Jev で一括判定。

### Request
```json
{
  "batch_id": "bulk_20260923_001"
}
```

### Response
```json
{
  "batch_id": "bulk_20260923_001",
  "scores": [
    {
      "recipe_id": 501,
      "sweet": 40,
      "spicy": 20,
      "umami": 75,
      "overall": 72,
      "confidence": 0.81
    },
    {
      "recipe_id": 502,
      "sweet": 60,
      "spicy": 10,
      "umami": 65,
      "overall": 70,
      "confidence": 0.79
    }
  ]
}
```

---

# **G. ランキング取得 API**

---

## **8. GET /api/recipes/bulk/{batch_id}/ranking**
甘味・旨味・総合などのランキング。

### Response
```json
{
  "batch_id": "bulk_20260923_001",
  "ranking": {
    "overall": [
      {"recipe_id": 501, "score": 72},
      {"recipe_id": 502, "score": 70}
    ],
    "sweet": [
      {"recipe_id": 502, "score": 60},
      {"recipe_id": 501, "score": 40}
    ],
    "umami": [
      {"recipe_id": 501, "score": 75},
      {"recipe_id": 502, "score": 65}
    ]
  }
}
```

---

# **I. お気に入り・コメント系 API（検索性向上）**

---

## **10. PATCH /api/recipes/{id}/favorite**
レシピのお気に入りフラグをON/OFF切替。

### Request
```json
{
  "is_favorite": true
}
```

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `is_favorite` | bool | はい | お気に入りフラグ（true: ON / false: OFF） |

### Response
```json
{
  "recipe_id": 101,
  "is_favorite": true
}
```

### エラー

| ステータス | 条件 |
|-----------|------|
| 404 | レシピIDが存在しない |

---

## **11. PUT /api/recipes/{id}/comment**
レシピにコメントを登録・更新（1レシピ1件、上書き更新）。空文字で削除。

### Request
```json
{
  "comment": "唐辛子を減らした方が好み"
}
```

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `comment` | string | はい | コメント本文（最大500文字、空文字で削除） |

### Response
```json
{
  "recipe_id": 101,
  "comment": "唐辛子を減らした方が好み",
  "updated_at": "2026-09-23T21:00:00Z"
}
```

### エラー

| ステータス | 条件 |
|-----------|------|
| 404 | レシピIDが存在しない |
| 422 | コメントが500文字を超える |

---

# **J. レーダーチャート用データ API**

---

## **12. GET /api/charts/radar**
複数レシピの味覚データをレーダー用に整形。

### Request
```json
{
  "recipe_ids": [101, 501, 502]
}
```

### Response
```json
{
  "chart_data": [
    {
      "recipe_id": 101,
      "scores": {
        "sweet": 40,
        "spicy": 60,
        "umami": 70,
        "overall": 68
      }
    },
    {
      "recipe_id": 501,
      "scores": {
        "sweet": 40,
        "spicy": 20,
        "umami": 75,
        "overall": 72
      }
    }
  ]
}
```

---

# **K. 味覚チャート検索 API（複数チャート対応）**

---

## **13. POST /api/recipes/search-by-taste**

複数の解析チャート（味・香り・食感・用途・栄養）を横断して類似レシピを検索。

### Request

```json
{
  "taste": {
    "sweet": 60,
    "salty": 40,
    "bitter": 10,
    "spicy": 70,
    "umami": 80,
    "overall": 75
  },
  "aroma": {
    "intensity": 65,
    "family": "herbal"
  },
  "texture": {
    "intensity": 50,
    "profile": "tender"
  },
  "function": {
    "thickener": 30,
    "umami_booster": 70
  },
  "nutrition": {
    "high_protein": 60,
    "low_calorie": 55
  },
  "sort_by": "overall",
  "sort_order": "desc",
  "min_confidence": 0.5,
  "limit": 10,
  "offset": 0
}
```

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `taste` | object | いいえ | 味覚6軸（各軸0〜100） |
| `taste.sweet` | int | いいえ | 甘さ（0〜100） |
| `taste.salty` | int | いいえ | 塩味（0〜100） |
| `taste.bitter` | int | いいえ | 苦味（0〜100） |
| `taste.spicy` | int | いいえ | 辛味（0〜100） |
| `taste.umami` | int | いいえ | うま味（0〜100） |
| `taste.overall` | int | いいえ | 総合（0〜100） |
| `aroma` | object | いいえ | 香り2軸 |
| `aroma.intensity` | int | いいえ | 香りの強度（0〜100） |
| `aroma.family` | string | いいえ | 香り系統（herbal/spice/citrus/nutty/smoky/fermented/floral/none） |
| `texture` | object | いいえ | 食感2軸 |
| `texture.intensity` | int | いいえ | 食感の強度（0〜100） |
| `texture.profile` | string | いいえ | 食感系統（crispy/chewy/tender/creamy/juicy/crunchy/fluffy/none） |
| `function` | object | いいえ | 用途プロファイル（各軸0〜100） |
| `function.thickener` | int | いいえ | とろみ付け（0〜100） |
| `function.sweetener` | int | いいえ | 甘味付け（0〜100） |
| `function.souring_agent` | int | いいえ | 酸味付け（0〜100） |
| `function.umami_booster` | int | いいえ | うま味補強（0〜100） |
| `function.aromatic_base` | int | いいえ | 香味付け（0〜100） |
| `function.fat_source` | int | いいえ | 脂質源（0〜100） |
| `nutrition` | object | いいえ | 栄養プロファイル（各軸0〜100） |
| `nutrition.high_fat` | int | いいえ | 高脂質（0〜100） |
| `nutrition.high_protein` | int | いいえ | 高タンパク（0〜100） |
| `nutrition.high_carb` | int | いいえ | 高炭水化物（0〜100） |
| `nutrition.fiber_rich` | int | いいえ | 高食物繊維（0〜100） |
| `nutrition.vitamin_rich` | int | いいえ | 高ビタミン（0〜100） |
| `nutrition.low_calorie` | int | いいえ | 低カロリー（0〜100） |
| `sort_by` | string | いいえ | 並べ替え軸（overall/sweet/salty/bitter/spicy/umami/aroma_intensity/texture_intensity/high_protein等） |
| `sort_order` | string | いいえ | asc/desc（デフォルト: desc） |
| `min_confidence` | float | いいえ | 最小信頼度（デフォルト: 0.0） |
| `limit` | int | いいえ | 取得件数（デフォルト: 10, 最大: 100） |
| `offset` | int | いいえ | オフセット（デフォルト: 0） |

> **設計判断:** 全チャートを任意パラメータにする。ユーザーが「味」と「香り」だけ指定しても検索可能。
> `sort_by` で任意の軸を昇順/降順に並べ替え可能。

### Response

```json
{
  "results": [
    {
      "recipe_id": 101,
      "title": "和風カレー",
      "taste_score": {
        "sweet": 62,
        "salty": 38,
        "bitter": 8,
        "spicy": 72,
        "umami": 78,
        "overall": 74,
        "confidence": 0.86
      },
      "aroma": {
        "intensity": 60,
        "family": "spice",
        "family_probabilities": {"spice": 0.55, "herbal": 0.30, "smoky": 0.15}
      },
      "texture": {
        "intensity": 45,
        "profile": "tender",
        "profile_probabilities": {"tender": 0.60, "chewy": 0.30, "creamy": 0.10}
      },
      "function_profile": {
        "thickener": 25,
        "sweetener": 40,
        "souring_agent": 10,
        "umami_booster": 72,
        "aromatic_base": 55,
        "fat_source": 35
      },
      "nutrition_profile": {
        "high_fat": 45,
        "high_protein": 55,
        "high_carb": 60,
        "fiber_rich": 20,
        "vitamin_rich": 15,
        "low_calorie": 40
      },
      "similarity_score": 0.95
    },
    {
      "recipe_id": 205,
      "title": "辛口鶏肉カレー",
      "taste_score": {
        "sweet": 45,
        "salty": 50,
        "bitter": 15,
        "spicy": 80,
        "umami": 75,
        "overall": 70,
        "confidence": 0.82
      },
      "aroma": {
        "intensity": 70,
        "family": "smoky",
        "family_probabilities": {"smoky": 0.65, "spice": 0.25, "herbal": 0.10}
      },
      "texture": {
        "intensity": 55,
        "profile": "juicy",
        "profile_probabilities": {"juicy": 0.70, "tender": 0.20, "creamy": 0.10}
      },
      "function_profile": {
        "thickener": 30,
        "sweetener": 35,
        "souring_agent": 15,
        "umami_booster": 75,
        "aromatic_base": 60,
        "fat_source": 40
      },
      "nutrition_profile": {
        "high_fat": 50,
        "high_protein": 60,
        "high_carb": 55,
        "fiber_rich": 18,
        "vitamin_rich": 20,
        "low_calorie": 38
      },
      "similarity_score": 0.88
    }
  ],
  "total": 42,
  "search_params": {
    "taste": {"sweet": 60, "salty": 40, "bitter": 10, "spicy": 70, "umami": 80, "overall": 75},
    "aroma": {"intensity": 65, "family": "herbal"},
    "texture": {"intensity": 50, "profile": "tender"},
    "function": {"thickener": 30, "umami_booster": 70},
    "nutrition": {"high_protein": 60, "low_calorie": 55}
  }
}
```

---

# **L. 並べ替え・絞り込み API**

---

## **14. POST /api/recipes/ranking**

任意の軸で昇順/降順に並べ替えてレシピを取得。

### Request

```json
{
  "sort_by": "umami",
  "sort_order": "desc",
  "filters": {
    "genre": "japanese",
    "aroma_family": "spice",
    "texture_profile": "tender",
    "min_confidence": 0.5,
    "favorite_only": false
  },
  "limit": 10,
  "offset": 0
}
```

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `sort_by` | string | はい | 並べ替え軸（overall/sweet/salty/bitter/spicy/umami/aroma_intensity/aroma_family/texture_intensity/texture_profile/high_protein等） |
| `sort_order` | string | いいえ | asc/desc（デフォルト: desc） |
| `filters` | object | いいえ | フィルタ条件 |
| `filters.genre` | string | いいえ | ジャンルフィルタ（japanese/chinese/western/sweets等） |
| `filters.aroma_family` | string | いいえ | 香り系統フィルタ（herbal/spice/citrus/nutty/smoky/fermented/floral/none） |
| `filters.texture_profile` | string | いいえ | 食感系統フィルタ（crispy/chewy/tender/creamy/juicy/crunchy/fluffy/none） |
| `filters.min_confidence` | float | いいえ | 最小信頼度（0.0〜1.0） |
| `filters.favorite_only` | bool | いいえ | おみのみ表示（デフォルト: false） |
| `limit` | int | いいえ | 取得件数（デフォルト: 10, 最大: 100） |
| `offset` | int | いいえ | オフセット（デフォルト: 0） |

### Response

```json
{
  "ranking": [
    {"recipe_id": 101, "title": "和風カレー", "umami": 78},
    {"recipe_id": 205, "title": "辛口鶏肉カレー", "umami": 75},
    {"recipe_id": 310, "title": "味噌ラーメン", "umami": 72}
  ],
  "total": 42,
  "sort_by": "umami",
  "sort_order": "desc"
}
```

---

# **M. taste_scores テーブル定義**

---

## **15. taste_scores テーブル（Jev評価結果）**

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

### インデックス

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

---
