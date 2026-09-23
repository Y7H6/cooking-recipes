# **4. API リクエスト／レスポンス JSON 詳細仕様（完全版）**

以下は **追加機能すべてを含む** API 仕様です。

---

# **A. レシピ検索・取得系 API**

---

## **1. GET /api/recipes/search**
既存レシピをジャンル・キーワードで検索。

### Request（例）
```json
{
  "genre": "和食",
  "keyword": "カレー"
}
```

### Response
```json
{
  "recipes": [
    {
      "id": 101,
      "title": "和風カレー",
      "genre": "和食",
      "thumbnail": "/images/recipe_101.jpg"
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

# **E. 100レシピ自動生成（バルク生成）**

---

## **6. POST /api/recipes/generate_bulk**
材料＋条件 → Qwen が 100レシピ生成。

### Request
```json
{
  "ingredients": ["鶏肉", "玉ねぎ", "醤油", "砂糖"],
  "constraints": {
    "style": "和食",
    "variation": "high"
  }
}
```

### Response
```json
{
  "batch_id": "bulk_20260923_001",
  "count": 100
}
```

---

# **F. 100レシピ一括評価（Jev）**

---

## **7. POST /api/recipes/evaluate_bulk**
100レシピを Jev で一括判定。

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

# **H. レーダーチャート用データ API**

---

## **9. GET /api/charts/radar**
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
