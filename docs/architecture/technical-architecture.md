### テクニカルアーキテクチャ概要  
Epicure × Jev API × Qwen3.8 27B Local  
Next.js + FastAPI + PostgreSQL

---

## 1. 全体構成

- **フロントエンド：Next.js**
  - 既存レシピ検索・選択・編集
  - 材料追加・削除・分量変更フォーム
  - Qwen補助レシピ生成・編集
  - 最大10レシピ自動生成ダッシュボード（生成数はユーザーが指定）
  - 味スコア・レーダーチャート表示

- **バックエンド：FastAPI**
  - Epicure CSVロード＆食材ベクトル管理
  - 味特徴量抽出ロジック
  - Jev APIクライアント（単発・一括判定）
  - Qwen3.8 27B Localクライアント（単発・バルク生成）
  - レシピ編集・保存・検索API
  - レーダーチャート用データ生成API

- **DB：PostgreSQL**
  - 既存レシピ・生成レシピ
  - 味スコア（単発・バルク）
  - 食材マスタ（Epicure ID紐付け）
  - バルク生成バッチ情報
  - レシピ編集履歴

---

## 2. FastAPI ディレクトリ構成

```text
app/
  main.py
  core/
    config.py
    db.py
  models/
    ingredient.py
    recipe.py
    taste_score.py
    bulk_batch.py
    recipe_edit.py
  schemas/
    ingredient.py
    recipe.py
    taste_score.py
    bulk_batch.py
  services/
    epicure_loader.py
    taste_feature_extractor.py
    jev_client.py
    qwen_client.py
    recipe_service.py
    bulk_service.py
    chart_service.py
  routers/
    recipes.py
    bulk.py
    charts.py
    search.py
```

---

## 3. 主なサービス責務

- **epicure_loader**
  - `epicure_core.csv`読み込み
  - `ingredient_id -> vector[300]`キャッシュ

- **taste_feature_extractor**
  - 食材＋分量 → ベクトル合成
  - ベクトル → 味特徴量（甘さ・辛さ・旨味など）

- **jev_client**
  - 単発判定：1レシピ → 味スコア
  - 一括判定：バッチ内のレシピ数（最大10） → 味スコア配列

- **qwen_client**
  - 単発生成：材料＋条件 → レシピ案
  - バルク生成：材料＋条件 → ユーザー指定数（最大10）のレシピ案

- **recipe_service**
  - 既存レシピ検索・取得
  - レシピ編集（追加・削除・分量変更）
  - 編集後レシピの評価・保存

- **bulk_service**
  - バッチID発行
  - ユーザー指定数（最大10）のレシピ生成＋保存
  - 一括JeV判定＋スコア保存

- **chart_service**
  - レーダーチャート用データ整形
  - 既存 vs 編集、生成 vs 改善、バルク比較

---

## 4. 主要APIエンドポイント（概要）

- **`GET /api/recipes/search`**
  - ジャンル・キーワードで既存レシピ検索

- **`GET /api/recipes/{id}`**
  - レシピ詳細取得（材料・作り方・スコア）

- **`POST /api/recipes/evaluate`**
  - 任意レシピ（編集済み含む）→ Jev単発判定

- **`POST /api/recipes/edit`**
  - 材料追加・削除・分量変更 → 再評価

- **`POST /api/recipes/assist`**
  - Qwen補助レシピ生成（編集可能モード）

- **`POST /api/recipes/generate_bulk`**
  - 材料＋条件 + `count`（1〜10, デフォルト1）→ Qwenで指定数生成 → バッチID返却

- **`POST /api/recipes/evaluate_bulk`**
  - バッチID指定 → Jev一括判定 → スコア保存

- **`GET /api/recipes/bulk/{batch_id}/ranking`**
  - 総合・甘味・旨味などのランキング取得

- **`GET /api/charts/radar`**
  - 指定レシピID群 → レーダーチャート用データ

---

## 5. データモデル（簡略）

- **ingredients**
  - `id`, `name`, `epicure_id`, `category`

- **recipes**
  - `id`, `title`, `body`, `source(user/qwen)`, `base_recipe_id`

- **recipe_ingredients**
  - `id`, `recipe_id`, `ingredient_id`, `amount`

- **taste_scores**
  - `id`, `recipe_id`, `sweet`, `spicy`, `salty`, `bitter`, `umami`, `overall`, `confidence`

- **bulk_batches**
  - `id`, `base_ingredients_json`, `constraints_json`, `created_at`

- **bulk_recipes**
  - `id`, `batch_id`, `recipe_id`

- **recipe_edits**
  - `id`, `recipe_id`, `diff_json`, `created_at`

---

## 6. データフロー（代表的な3パターン）

### ① 既存レシピ編集＋評価

1. Next.js：検索→レシピ選択  
2. 編集フォームで材料追加・削除・分量変更  
3. `POST /api/recipes/edit`  
4. FastAPI：Epicure→特徴量→Jev判定→保存  
5. `GET /api/charts/radar` で元レシピ vs 編集後を表示

### ② Qwen補助レシピ生成＋編集＋評価

1. 材料＋条件入力  
2. `POST /api/recipes/assist` → Qwen生成  
3. 生成レシピを編集フォームに展開  
4. 編集後を `POST /api/recipes/evaluate`  
5. レーダーチャートで味の変化表示

### ③ バルク生成＋一括判定＋ランキング（ユーザー指定数、最大10）

1. 材料＋条件＋生成数（count）入力
2. `POST /api/recipes/generate_bulk` → バッチID
3. `POST /api/recipes/evaluate_bulk` → Jev一括判定
4. `GET /api/recipes/bulk/{batch_id}/ranking` → ランキング
5. `GET /api/charts/radar` → 代表レシピの味分布表示

---
