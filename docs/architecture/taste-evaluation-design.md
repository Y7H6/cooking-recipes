# 味覚判断設計（Jev × Qwen 二言語対応）

Epicure × Jev × Qwen3.8 27B Local における **味覚判断の軸設計** と
**日本語入力 → 英語評価 → 日本語表示** の二言語データフロー設計。

- 作成日: 2026-09-24
- 対象: UC-03（レシピ評価）/ UC-05（Qwen 補助生成）/ UC-06（バルク生成）
- 関連: [`technical-architecture.md`](technical-architecture.md) / [`data-flow-graph.md`](data-flow-graph.md) / [`api-spec-details.md`](../api/api-spec-details.md)

---

## 1. 調査結果：backend/data のデータと味覚軸の判定可能性

### 1.1 データファイル一覧

| ファイル | 行数（食材数） | 構造 | 用途 |
|----------|---------------|------|------|
| [`vocab.csv`](../../backend/data/vocab.csv) | 1,791 | `name, node_id_cooc, node_id_core, node_id_chem` | 食材名（英語）と各 CSV の node_id 対応表 |
| [`epicure_core.csv`](../../backend/data/epicure_core.csv) | 1,791 | `node_id, name, dim_0 … dim_299` | 食材ベクトル（core、300 次元） |
| [`epicure_cooc.csv`](../../backend/data/epicure_cooc.csv) | 1,791 | `node_id, name, dim_0 … dim_299` | 食材ベクトル（共起、300 次元） |
| [`epicure_chem.csv`](../../backend/data/epicure_chem.csv) | 1,791 | `node_id, name, dim_0 … dim_299` | 食材ベクトル（化学、300 次元） |

### 1.2 重要な発見：Epicure ベクトルには「味覚軸」の明示列がない

- Epicure の 300 次元ベクトルは **学習済み潜在空間（latent space）** であり、
  `dim_0`〜`dim_299` のいずれも「甘み」「塩味」などの **解釈可能な味覚軸ではない**。
- したがって、**Epicure 単体では「甘み=40、塩味=60」のような数値判定はできない**。
- Epicure が PoC で果たせる役割は以下の 3 つに限定される：
  1. **食材類似度検索**（cosine similarity）— 代替食材提案
  2. **レシピの味空間表現**（分量重み付きベクトル合成）— レシピ同士の類似度比較
  3. **Jev 判定の補助コンテキスト**（将来：主要食材のベクトル近傍情報を state に付与）

### 1.3 結論：味覚軸の判定は Jev（TypeSafe AI）が担う

| 味覚軸 | 判定可否 | 判定手段 |
|--------|---------|---------|
| 甘み（sweet） | ✅ 判定可能 | Jev `Score` プリミティブ |
| 塩味（salty） | ✅ 判定可能 | Jev `Score` プリミティブ |
| 苦み（bitter） | ✅ 判定可能 | Jev `Score` プリミティブ |
| 辛み（spicy） | ✅ 判定可能 | Jev `Score` プリミティブ |
| うま味（umami） | ✅ 判定可能 | Jev `Score` プリミティブ |
| 総合（overall） | ✅ 判定可能 | Jev `Score` プリミティブ（独立質問） |
| 香り（aroma） | ✅ 判定可能 | Jev `Score`（強度）＋ `Choice`（香りの系統）— 詳細は §10 |
| 食感（texture） | ⚠️ 判定可能（低信頼度傾向） | Jev `Score`（強度）＋ `Choice`（食感の系統）— 詳細は §11 |
| 調理法（cooking_method） | ❌ Epicure ベクトルには含まれない / ✅ Jev でテキスト判定可能 | 詳細は §12 |
| 料理文化（cuisine） | ⚠️ 文化名ノードは無いが代表食材は高カバー / ✅ Jev 判定＋Epicure 文化重心ベクトルで補強可能 | 詳細は §13 |
| 用途（culinary function） | ⚠️ 用途名ノードは無いが代表食材は高カバー / ✅ 静的分類表＋Epicure 用途方向ベクトルで表現可能 | 詳細は §14 |
| 栄養的特徴（nutritional profile） | ⚠️ 栄養属性名ノードは無いが代表食材は高カバー / ✅ 静的分類表＋Epicure chem 方向ベクトルで意味的傾向を表現可能（完全な栄養データではない） | 詳細は §15 |

**根拠（TypeSafe AI 仕様）:**
- Jev の `Score` プリミティブは、定義した **順序付きレベル（criteria）** に対して
  **確率重み付きスコア（0〜最大レベル番号）＋ confidence（0〜1）＋ 各レベルの確率分布** を返す。
- 1 リクエストで **複数の独立質問を並列に** 送れるため、6 軸（5 味覚 + overall）を
  1 回の API 呼び出しで判定できる。
- 入力（state）は自然言語テキスト（英語）であり、レシピの材料＋作り方をそのまま渡せる。

> **設計上の注意:** Jev は「型付きの判断」を返すが、**真値を保証するものではない**。
> PoC 段階では 5 レベル（0〜4）の粗い粒度で判定し、確率分布（probabilities）を
> 生データとして DB に保存し、後日の妥当性検証・重み調整に使う。

---

## 2. 味覚判断の軸設計（Jev 質問定義）

### 2.1 軸とスケール

- **6 軸**: `sweet` / `salty` / `bitter` / `spicy` / `umami` / `overall`
  （香りの判定軸 `aroma_intensity` / `aroma_family` は §10、
   食感の判定軸 `texture_profile` / `texture_intensity` は §11、
   調理法 `cooking_method` は §12、
   料理文化 `genre`（cuisine）は §13、
    用途 `culinary_function` は §14、
    栄養的特徴 `nutrition_profile` は §15 で別途設計）
- **各軸 5 レベル（0〜4）**: 全軸共通の 5 段階アンカー定義を使用
- **UI 表示スケール**: `score(0〜4) × 25 → 0〜100` に変換してレーダーチャート表示

### 2.2 レベル定義（criteria、英語）

各軸共通の 5 段階アンカー（Jev には英語で渡す）:

| レベル | 定義（英語） |
|--------|-------------|
| 0 | "Essentially none of this taste is perceptible in the finished dish." |
| 1 | "Barely perceptible; only detectable by someone paying close attention." |
| 2 | "Clearly present but moderate; it contributes to the flavor without dominating." |
| 3 | "Strong and prominent; it is one of the main characteristics of the dish." |
| 4 | "Intense and dominant; it defines the dish and is hard to ignore." |

軸ごとの `instructions`（英語）:

| 軸 | instructions |
|----|-------------|
| sweet | "Rate the perceived sweetness of the finished dish, considering all ingredients, their amounts, and the cooking method." |
| salty | "Rate the perceived saltiness of the finished dish, considering all ingredients, their amounts, and the cooking method." |
| bitter | "Rate the perceived bitterness of the finished dish, considering all ingredients, their amounts, and the cooking method." |
| spicy | "Rate the perceived spiciness (heat from chili or pepper) of the finished dish, considering all ingredients, their amounts, and the cooking method." |
| umami | "Rate the perceived umami (savory, meaty, brothy depth) of the finished dish, considering all ingredients, their amounts, and the cooking method." |
| overall | "Rate the overall flavor balance and appeal of the finished dish as a whole." |

### 2.3 Jev リクエスト例（英語 state）

```json
{
  "model": "jev-latest",
  "state": {
    "title": "Japanese-style Chicken Curry",
    "ingredients": [
      {"name": "chicken thigh", "amount": "200 g"},
      {"name": "onion", "amount": "100 g"},
      {"name": "curry roux", "amount": "4 blocks"},
      {"name": "soy sauce", "amount": "20 ml"},
      {"name": "honey", "amount": "10 g"}
    ],
    "instructions": "Sauté the onion, add chicken and simmer, then dissolve the curry roux. Season with soy sauce and honey."
  },
  "questions": {
    "sweet":   {"type": "score", "instructions": "Rate the perceived sweetness of the finished dish, considering all ingredients, their amounts, and the cooking method.", "criteria": ["Essentially none...", "Barely perceptible...", "Clearly present but moderate...", "Strong and prominent...", "Intense and dominant..."]},
    "salty":   {"type": "score", "instructions": "Rate the perceived saltiness ...", "criteria": ["..."]},
    "bitter":  {"type": "score", "instructions": "Rate the perceived bitterness ...", "criteria": ["..."]},
    "spicy":   {"type": "score", "instructions": "Rate the perceived spiciness (heat from chili or pepper) ...", "criteria": ["..."]},
    "umami":   {"type": "score", "instructions": "Rate the perceived umami (savory, meaty, brothy depth) ...", "criteria": ["..."]},
    "overall": {"type": "score", "instructions": "Rate the overall flavor balance and appeal ...", "criteria": ["..."]}
  }
}
```

### 2.4 Jev レスポンス例と DB 保存マッピング

```json
{
  "answers": {
    "sweet":   {"type": "score", "score": 1.06, "confidence": 0.91, "probabilities": {"0": 0.0, "1": 0.70, "2": 0.30, "3": 0.0, "4": 0.0}},
    "salty":   {"type": "score", "score": 2.30, "confidence": 0.85, "probabilities": {"0": 0.0, "1": 0.10, "2": 0.55, "3": 0.30, "4": 0.05}},
    "bitter":  {"type": "score", "score": 0.40, "confidence": 0.88, "probabilities": {"0": 0.60, "1": 0.35, "2": 0.05, "3": 0.0, "4": 0.0}},
    "spicy":   {"type": "score", "score": 2.80, "confidence": 0.82, "probabilities": {"0": 0.0, "1": 0.05, "2": 0.35, "3": 0.50, "4": 0.10}},
    "umami":   {"type": "score", "score": 2.50, "confidence": 0.87, "probabilities": {"0": 0.0, "1": 0.10, "2": 0.45, "3": 0.40, "4": 0.05}},
    "overall": {"type": "score", "score": 2.60, "confidence": 0.84, "probabilities": {"0": 0.0, "1": 0.05, "2": 0.50, "3": 0.40, "4": 0.05}}
  }
}
```

| Jev 出力 | DB 列（taste_scores） | 変換 |
|----------|----------------------|------|
| `answers.sweet.score` | `sweet` | `round(score × 25)` → 0〜100 |
| `answers.sweet.confidence` | `sweet_confidence` | そのまま（0〜1） |
| `answers.sweet.probabilities` | `raw_json` に格納 | 妥当性検証用 |
| （全軸共通） | `confidence` | 6 軸 confidence の平均 |

> **設計判断:** 各軸の confidence を個別に保存する（既存設計の単一 `confidence` 列から拡張）。
> レーダーチャートは `score × 25` を使用し、confidence が低い軸（< 0.5）は
> UI で「低信頼度」バッジを表示する。

---

## 3. 二言語データフロー設計（日本語入力 → 英語評価 → 日本語表示）

### 3.1 基本方針

```
ユーザー（日本語）
   │
   ▼
Qwen3.8 27B Local ── ① レシピ生成（日本語出力）
   │                  ② 日本語 → 英語翻訳（構造化 JSON 出力）
   ▼
PostgreSQL ── 日本語列（_ja）＋ 英語列（_en）を対で格納
   │
   ├── 英語列（_en）のみ → Jev に渡す（英語入力 → 英語出力）
   │
   ▼
Next.js ── 日本語列（_ja）を画面表示に使用
```

**原則:**
1. **Qwen は日本語で生成し、日本語を英語に翻訳する。** 翻訳は Qwen の構造化出力
   （Ollama `format` パラメータの JSON Schema 制約）で行い、Pydantic で検証する。
2. **DB は英語・日本語を対（pair）で格納する。** 翻訳は 1 回だけ行い、
   評価のたびに再翻訳しない（コスト・レイテンシ削減）。
3. **Jev は英語のみ受け取り、英語のみ出力する。** 日本語を Jev に渡さない。
4. **画面表示は日本語列（_ja）を使用する。** 英語列は Jev 評価・将来の多言語対応用。

### 3.2 翻訳のタイミング

| シナリオ | 翻訳タイミング |
|----------|---------------|
| ユーザーが日本語レシピを登録 | 登録時に 1 回翻訳 → `_en` 列保存 |
| Qwen がレシピを生成（日本語出力） | 生成直後に翻訳 → `_en` 列保存 |
| レシピ編集（材料追加・削除・分量変更） | 変更分のみ再翻訳 → `_en` 列更新 → Jev 再評価 |
| Jev 再評価 | 翻訳不要（既存 `_en` 列を使用） |

### 3.3 Qwen 翻訳の構造化出力（JSON Schema 例）

```json
{
  "title_en": "Japanese-style Chicken Curry",
  "ingredients_en": [
    {"name_en": "chicken thigh", "amount": "200 g"},
    {"name_en": "onion", "amount": "100 g"}
  ],
  "instructions_en": "Sauté the onion, add chicken and simmer, then dissolve the curry roux."
}
```

- 翻訳は **食材名・分量・作り方** を 1 リクエストでまとめて行う（往復 1 回）。
- 分量（`amount`）は数値＋単位なので翻訳不要。
- 翻訳失敗時は Qwen 生成と同様に最大 3 回リトライ、失敗時は 502 を返却。

---

## 4. DB 設計（二言語対応）

### 4.1 recipes テーブル（変更点）

| 列 | 型 | 説明 |
|----|----|------|
| `id` | SERIAL PK | |
| `title_ja` | TEXT NOT NULL | 日本語タイトル（**画面表示用**） |
| `title_en` | TEXT NOT NULL | 英語タイトル（**Jev 評価用**） |
| `instructions_ja` | TEXT | 日本語作り方（画面表示用） |
| `instructions_en` | TEXT | 英語作り方（Jev 評価用） |
| `genre` | TEXT | ジャンル（和食・中華・洋食・スイーツ） |
| `source` | TEXT | `user` / `qwen` |
| `base_recipe_id` | INT FK | 元レシピ ID（編集・生成系） |
| `is_favorite` | BOOLEAN | お気に入りフラグ |
| `comment` | TEXT | コメント（最大 500 文字） |
| `comment_updated_at` | TIMESTAMPTZ | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### 4.2 recipe_ingredients テーブル（変更点）

| 列 | 型 | 説明 |
|----|----|------|
| `id` | SERIAL PK | |
| `recipe_id` | INT FK | |
| `name_ja` | TEXT NOT NULL | 日本語食材名（**画面表示用**） |
| `name_en` | TEXT NOT NULL | 英語食材名（**Jev 評価用**） |
| `amount` | NUMERIC | 分量 |
| `unit` | TEXT | 単位（g / ml / 個 / 枚 等） |
| `epicure_node_id` | INT | Epicure vocab.csv の node_id（NULL 可） |

> **Epicure 紐付け:** `name_en` を [`vocab.csv`](../../backend/data/vocab.csv) の `name`
> と一致させて `epicure_node_id` を解決する。一致しない場合は NULL（Jev 評価には影響しない）。

### 4.3 taste_scores テーブル（拡張）

| 列 | 型 | 説明 |
|----|----|------|
| `id` | SERIAL PK | |
| `recipe_id` | INT FK | |
| `sweet` | SMALLINT | 0〜100（Jev score × 25） |
| `salty` | SMALLINT | 0〜100 |
| `bitter` | SMALLINT | 0〜100 |
| `spicy` | SMALLINT | 0〜100 |
| `umami` | SMALLINT | 0〜100 |
| `overall` | SMALLINT | 0〜100 |
| `sweet_confidence` | REAL | 0〜1（各軸個別） |
| `salty_confidence` | REAL | 0〜1 |
| `bitter_confidence` | REAL | 0〜1 |
| `spicy_confidence` | REAL | 0〜1 |
| `umami_confidence` | REAL | 0〜1 |
| `overall_confidence` | REAL | 0〜1 |
| `confidence` | REAL | 6 軸平均（既存互換） |
| `raw_json` | JSONB | Jev の生レスポンス（probabilities 含む、検証用） |
| `evaluated_at` | TIMESTAMPTZ | 評価日時 |

> 1 レシピに複数回の評価履歴を残す（編集のたびに追加）。最新評価は
> `evaluated_at DESC` の先頭。レーダーチャートは最新評価を使用。

---

## 5. サービス層設計（FastAPI）

### 5.1 責務分離

| サービス | 責務 | 変更点 |
|----------|------|--------|
| [`qwen_client.py`](../../backend/app/services/__init__.py) | レシピ生成（日本語）＋ **翻訳（日本語→英語）** | 翻訳メソッド `translate_recipe()` を追加 |
| [`jev_client.py`](../../backend/app/services/__init__.py) | **英語レシピ → 6 軸味覚判定** | 質問定義（criteria）を定数化 |
| [`recipe_service.py`](../../backend/app/services/__init__.py) | 登録・編集・評価のオーケストレーション | 二言語保存＋評価の順序制御 |
| [`epicure_loader.py`](../../backend/app/services/__init__.py) | 食材ベクトル読み込み・類似度検索 | 味覚判定には使用しない（類似度のみ） |

### 5.2 評価オーケストレーション（recipe_service）

```
evaluate_recipe(recipe_id):
  1. DB から _en 列（title_en, ingredients_en, instructions_en）を取得
  2. _en 列が NULL の場合 → qwen_client.translate_recipe() で翻訳 → _en 列保存
  3. jev_client.evaluate(recipe_en) → 6 軸スコア＋confidence＋probabilities
  4. taste_scores に保存（score × 25 変換、raw_json 保存）
  5. 変換後スコアを返却
```

### 5.3 Jev クライアントの質問定義（定数化）

- 6 軸の `instructions` と `criteria`（5 レベル）は
  [`jev_client.py`](../../backend/app/services/__init__.py) 内の **モジュール定数**
  （`UPPER_SNAKE_CASE`）として定義し、ハードコード散在を避ける。
- レベル定義の文言変更は定数 1 箇所の変更で反映される。

---

## 6. API 設計（変更点）

### 6.1 レシピ詳細取得（GET /api/recipes/{id}）

- レスポンスに **日本語列（_ja）を優先** で返却（画面表示用）。
- `taste_score` に 6 軸＋各軸 confidence を含める。

```json
{
  "id": 101,
  "title": "和風カレー",
  "title_en": "Japanese-style Chicken Curry",
  "ingredients": [
    {"name": "鶏もも肉", "name_en": "chicken thigh", "amount": 200, "unit": "g"}
  ],
  "instructions": "玉ねぎを炒め、鶏肉を加えて煮込み、カレールウを溶かす。",
  "taste_score": {
    "sweet": 27, "salty": 58, "bitter": 10, "spicy": 70, "umami": 63, "overall": 65,
    "confidence": 0.86,
    "axis_confidence": {"sweet": 0.91, "salty": 0.85, "bitter": 0.88, "spicy": 0.82, "umami": 0.87, "overall": 0.84}
  }
}
```

### 6.2 評価 API（POST /api/recipes/evaluate）

- リクエストは **日本語で受け付ける**（既存仕様と互換）。
- バックエンドが内部で `_en` 列を確認し、必要なら翻訳 → Jev 評価 → 保存。
- レスポンスは 6 軸スコア（0〜100）＋ confidence を返却。

### 6.3 レーダーチャート（GET /api/charts/radar）

- 軸は 6 つ（sweet / salty / bitter / spicy / umami / overall）に拡張。
- 値は `taste_scores` の最新評価（0〜100）を使用。

---

## 7. セキュリティ・運用上の考慮

| 項目 | 対応 |
|------|------|
| Jev API キー | [`config.py`](../../backend/app/core/config.py) の `jev_api_key` 経由（`.env` 管理、コミット禁止） |
| 翻訳コスト抑制 | 翻訳は 1 回のみ（`_en` 列キャッシュ）、再評価時は再翻訳しない |
| Jev レイテンシ | 6 軸を 1 リクエストで並列判定（TypeSafe の複数質問並列実行） |
| 低信頼度判定 | confidence < 0.5 の軸は UI でバッジ表示、ランキングでは除外オプション |
| 妥当性検証 | `raw_json`（probabilities）を保存し、後日的人工ラベルとの比較に使用 |
| Epicure ライセンス | CC BY 4.0 のクレジット表記を UI・README に維持 |

---

## 8. 実装フェーズ（推奨）

| フェーズ | 内容 | 依存 |
|----------|------|------|
| 1 | DB マイグレーション（二言語列＋taste_scores 拡張） | なし |
| 2 | `jev_client.py`（6 軸質問定義＋英語評価） | JEV_API_KEY |
| 3 | `qwen_client.translate_recipe()`（構造化翻訳） | QWEN_ENDPOINT |
| 4 | `recipe_service` のオーケストレーション（二言語保存＋評価） | フェーズ 1〜3 |
| 5 | API レスポンス拡張（6 軸＋日本語優先表示） | フェーズ 4 |
| 6 | Next.js レーダーチャート 6 軸対応＋低信頼度バッジ | フェーズ 5 |

---

## 9. 未確定事項（要確認）

1. **Jev のモデル指定:** `jev-latest` を使用するか、固定バージョンにするか
   （再現性重視なら固定バージョンを推奨）。
2. **5 レベルの粒度:** PoC では 5 段階（0〜4）を推奨。11 段階（0〜10）にすると
   解像度は上がるが confidence が下がる傾向がある。
3. **overall の算出:** Jev に独立質問するか、5 軸の加重平均をコードで算出するか。
   現時点では **Jev 独立質問** を推奨（「バランス」は 5 軸の単純平均では表現できないため）。
4. **Epicure の活用範囲:** PoC では類似度検索のみ。味覚軸への射影（PCA 等）は
   人工ラベルデータが揃った後の将来課題。

---

## 10. 香り（aroma）判定の設計

### 10.1 判定可能性：Jev で判定可能 ✅

- 味覚 5 軸と同様に、**Jev の英語テキスト入力（材料＋作り方）から香りの判定は可能**。
  香りは材料（ハーブ・スパイス・柑橘・ナッツ・発酵品・スモーク等）と
  調理法（焼く・炒める・蒸す等）から強く決まるため、自然言語で記述された
  レシピから Jev が推定できる。
- **Epicure 側のカバー状況**（[`vocab.csv`](../../backend/data/vocab.csv) 調査結果）:
  - 香り関連食材が **100 件以上** 存在。主な例:
    - **ハーブ類:** `basil` / `rosemary` / `thyme` / `oregano` / `parsley` / `dill` / `tarragon` / `chervil` / `marjoram` / `sage` / `garlic_chive` / `curry_leaf`
    - **スパイス類:** `cinnamon` / `clove` / `nutmeg` / `mace` / `star_anise` / `anise` / `cardamom` / `cumin` / `coriander` / `fennel` / `allspice` / `sumac` / `garam_masala` / `baharat` / `zaatar` / `paprika` / `smoked_paprika`
    - **柑橘・果実類:** `lemon` / `lime` / `orange` / `bergamot` / `grapefruit` / `yuzu` / `kumquat` / `tangerine` / `clementine` / `blood_orange` / `orange_blossom_water`
    - **ナッツ類:** `almond` / `hazelnut` / `walnut` / `pecan` / `pistachio` / `macadamia_nut` / `pine_nut` / `chestnut` / `peanut` / `cashew`
    - **発酵・旨味香:** `miso` / `dashi` / `bonito` / `bonito_flakes` / `kombu` / `nori` / `wakame` / `aonori` / `kimchi` / `sauerkraut` / `natto` / `black_garlic` / `fish_sauce` / `oyster_sauce`
    - **スモーク系:** `liquid_smoke` / `smoked_salt` / `smoked_paprika` / `smoked_salmon` / `smoked_meat` / `mesquite`
    - **花・甘香系:** `lavender` / `chamomile` / `hibiscus` / `rosewater` / `vanilla` / `saffron` / `licorice_root` / `poppy_seed` / `gardenia_flower`
    - **和食系:** `perilla`（しそ）/ `perilla_oil` / `sansho_pepper`（山椒）/ `yuzu` / `yuzu_kosho` / `mitsuba` / `aonori` / `dashi`
  - **欠落例:** `sudachi`（すだち）/ `kabosu`（かぼす）/ `jasmine`（ジャスミン）/ `pandan`（パンダン）/ `kaffir_lime`（カフィアライム）/ 花椒（sichuan pepper）
  - **重要:** この欠落は **Epicure 類似度検索への影響のみ**。Jev 判定は英語テキストを直接読むため、
    「sudachi」が vocab に無くても Jev は正しく香りを判定できる。
- **設計上の注意（味覚との違い）:**
  1. 香りは **多次元・多系統** であり、単一の強度スケールでは表現しきれない
     （例: 「ハーブ香が強く、ほのかなスモーク香」）。
  2. 香りの主観性は味覚より高く、confidence が低くなる傾向がある。
  3. したがって香りは **2 段階の質問**（強度の Score ＋ 系統の Choice）で設計する。

### 10.2 香りの判定軸設計（2 軸構成）

#### 軸 A: 香りの強度（aroma_intensity）— `Score` プリミティブ

味覚 5 軸と同じ 5 レベル（0〜4）の `Score` を使用。

| レベル | 定義（英語） |
|--------|-------------|
| 0 | "No distinctive aroma; the dish is essentially odorless." |
| 1 | "Faint aroma; only noticeable when close to the dish." |
| 2 | "Noticeable aroma; it is part of the eating experience but not dominant." |
| 3 | "Strong aroma; it is prominent and contributes significantly to the dish's identity." |
| 4 | "Powerful, defining aroma; it announces the dish before the first bite." |

`instructions`: "Rate the overall aroma intensity of the finished dish, considering all ingredients, their amounts, and the cooking method."

#### 軸 B: 香りの系統（aroma_family）— `Choice` プリミティブ

香りの **主たる系統** を 1 つ選択させる（`Choice` は 1 択＋確率分布を返す）。
選択肢は食品科学の香気分類（aroma wheel）を参考に、料理文脈で実用的な 8 系統に集約:

| 系統（英語） | 説明 | 代表食材（vocab 例） |
|--------------|------|---------------------|
| `herbal` | ハーブ・葉物由来の清涼香 | basil, rosemary, thyme, oregano, perilla, dill, tarragon |
| `spice` | スパイス由来の辛香・温香 | cinnamon, clove, nutmeg, cumin, cardamom, star_anise, sansho_pepper |
| `citrus` | 柑橘由来の爽やかな香 | lemon, yuzu, bergamot, orange, kumquat |
| `nutty` | ナッツ・焙煎由来の香 | almond, hazelnut, walnut, coffee, toasted sesame |
| `smoky` | 煙・火入れ由来の香 | liquid_smoke, smoked_paprika, mesquite, grilled |
| `fermented` | 発酵由来の香（旨香・酸香） | miso, dashi, kimchi, natto, black_garlic, fish_sauce |
| `floral` | 花・甘香由来の香 | lavender, vanilla, saffron, rosewater, chamomile |
| `none` | 特徴的な香りがほぼない | —（水物・シンプルな煮物等） |

`Choice` の利点:
- 確率分布（例: `herbal: 0.55, spice: 0.30, smoky: 0.15`）が得られるため、
  **複合的な香り**（ハーブ香＋スモーク香）も分布で表現できる。
- 1 択に制約するため、Score 単体より安定した判定が期待できる。

### 10.3 Jev リクエスト例（香り 2 軸追加）

既存の味覚 6 軸質問に、以下の 2 質問を **同一リクエストに追加** する
（TypeSafe は独立質問を並列実行するため、追加レイテンシは最小）:

```json
{
  "aroma_intensity": {
    "type": "score",
    "instructions": "Rate the overall aroma intensity of the finished dish, considering all ingredients, their amounts, and the cooking method.",
    "criteria": ["No distinctive aroma...", "Faint aroma...", "Noticeable aroma...", "Strong aroma...", "Powerful, defining aroma..."]
  },
  "aroma_family": {
    "type": "choice",
    "instructions": "Select the dominant aroma family of the finished dish. Choose the single most characteristic aroma. If no distinctive aroma is present, choose 'none'.",
    "options": ["herbal", "spice", "citrus", "nutty", "smoky", "fermented", "floral", "none"]
  }
}
```

### 10.4 DB 設計（taste_scores 拡張）

| 列 | 型 | 説明 |
|----|----|------|
| `aroma_intensity` | SMALLINT | 0〜100（Jev score × 25） |
| `aroma_intensity_confidence` | REAL | 0〜1 |
| `aroma_family` | TEXT | 主たる香りの系統（herbal / spice / citrus / nutty / smoky / fermented / floral / none） |
| `aroma_family_confidence` | REAL | 0〜1（Choice の確率集中度） |
| `aroma_family_probabilities` | JSONB | 各系統の確率分布（複合香りの表示・分析用） |

> `raw_json`（既存）に Jev の生レスポンス全体が格納されるため、
> 上記列は **表示・ランキング用の正規化カラム** として追加する。

### 10.5 UI 表示設計

- **レーダーチャート:** 軸は 6（味覚）→ **7 軸**（aroma_intensity を追加）に拡張。
  香りの系統（aroma_family）はレーダーではなく **バッジ表示**（例: 「🌿 ハーブ香」「🔥 スモーク香」）。
- **香りの系統の日本語表示:** DB には英語キー（`herbal` 等）を保存し、
  表示層（Next.js）で日本語ラベルへマッピングする（`herbal → ハーブ香` 等）。
  マッピング表は [`frontend/lib/`](../../frontend/lib/) の定数ファイルに置く。
- **複合香りの表示:** `aroma_family_probabilities` の上位 2 系統を
  「ハーブ香（主）＋スモーク香（副）」のように表示するオプション。
- **低信頼度:** confidence < 0.5 の場合は系統バッジを非表示（強度のみ表示）。

### 10.6 ランキングへの反映

- バルクランキング（`GET /api/recipes/bulk/{batch_id}/ranking`）に
  `aroma_intensity` ランキングを追加可能。
- 系統別のフィルタ（例: 「ハーブ香の強いレシピのみ」）は
  `aroma_family = 'herbal'` の WHERE 条件で実現。

### 10.7 未確定事項（香り関連）

1. **系統の粒度:** 8 系統は PoC として適切。16 系統（aroma wheel 準拠）にすると
   解像度は上がるが Choice の確率が分散し confidence が下がる。
2. **複数選択の可否:** `Choice` は 1 択。複数系統を明示的に選択させる場合は
   系統ごとの `Noul`（各系統が支配的か yes/no）を 8 問並列にする案もあるが、
   トークンコスト・レイテンシが増えるため PoC では 1 択＋確率分布で十分。
3. **香りの時間軸:** 「提供直後の香り」と「食べながらの香り（retronasal）」は
   異なるが、PoC では提供直後の香り（orthonasal）のみを判定対象とする。

---

## 11. 食感（texture / mouthfeel）判定の設計

### 11.1 判定可能性：Jev で判定可能だが「低信頼度傾向」⚠️

**結論: 判定は可能だが、味覚・香りより信頼性が低い。** 理由と対策を整理する。

#### 判定が難しい理由（味覚・香りとの違い）

1. **テキストからの推定が間接的**
   - 味覚・香りは「材料 → 味/香り」が直接的に決まるが、食感は
     **材料 × 分量 × 調理法 × 調理時間 × 温度** の組み合わせで決まる。
     例: 同じ「鶏もも肉 200g」でも「さっと炒める」なら歯ごたえがあり、
     「2 時間煮込む」ならほろほろになる。
   - レシピテキストに調理時間・火加減が曖昧に書かれていると、
     Jev の推定精度が下がる（→ confidence が低くなる）。
2. **食感形容詞は vocab.csv に存在しない**
   - [`vocab.csv`](../../backend/data/vocab.csv) は食材名リストであり、
     `crispy` / `chewy` / `tender` 等の食感形容詞は存在しない（調査済み）。
   - ただし **食感を決める機能性食材は vocab に存在する**（下表）。
     これらは Epicure 類似度検索・将来の食感特徴量抽出に使える。
3. **主観性が高い**
   - 「もちもち」「ぷるぷる」のような食感は文化・個人差が大きく、
     味覚よりアンカー定義が難しい。

#### 判定を可能にする vocab の食感関連食材（調査結果）

| カテゴリ | vocab に存在する例 | 食感への寄与 |
|----------|-------------------|-------------|
| ゲル化・増粘剤 | `gelatin` / `agar` / `pectin` / `guar_gum` / `cornstarch` / `arrowroot` / `tapioca` / `tapioca_pearl` / `sago` / `glycerin` | ぷるぷる・とろみ・もちもち |
| 豆腐・大豆 | `tofu` / `tofu_pudding` / `tofu_skin` / `fermented_tofu` / `stinky_tofu` / `rice_tofu` | 絹・木綿・滑らか |
| 麺・粉もの | `noodle` / `rice_noodle` / `rice_paper` / `pasta` / `gnocchi` / `ravioli` / `tortellini` / `dumpling` / `dumpling_wrapper` / `senbei` / `rice_cake` / `glutinous_rice` / `glutinous_rice_flour` / `fermented_glutinous_rice` | もちもち・コシ・サクサク |
| 菓子・生地 | `croissant` / `puff_pastry` / `phyllo_dough` / `crispbread` / `bread` / `bread_crumbs` / `meringue` / `cotton_candy` / `toffee` / `tortilla` | フワフワ・サクサク・シャキシャキ |
| 乳製品・デザート | `butter` / `buttercream` / `cream` / `cream_cheese` / `custard` / `custard_powder` / `ganache` / `pudding` / `ice_cream` / `ice` / `advocaat` | クリーミー・なめらか・シャリシャリ |
| 穀物 | `basmati_rice` / `brown_rice` / `glutinous_rice` / `quinoa` / `bulgur` / `farro` / `couscous` / `semolina` / `cornmeal` / `oat` | 粒感・もちもち・ほろほろ |

> **設計上の含意:** 食感判定は Jev の英語テキスト推定が主軸。
> Epicure の機能性食材（ゲル化剤等）は、将来「食感特徴量」を
> ベクトル合成で補強する際の候補（PoC では未使用）。

### 11.2 食感の判定軸設計（香りと同じ 2 軸構成）

#### 軸 A: 食感の印象（texture_profile）— `Choice` プリミティブ

食感は「強度」より **「どのような食感か」** が重要なので、
香りと違い **系統の Choice を主軸** にする。
食品科学の食感分類（crispness / chewiness / creaminess 等）を参考に、
料理文脈で実用的な 8 系統に集約:

| 系統（英語） | 日本語表示 | 説明 | 代表例 |
|--------------|-----------|------|--------|
| `crispy` | サクサク・カリカリ | 噛むと音を立てて崩れる | 揚げ物、croissant、crispbread、天ぷら |
| `chewy` | もちもち・コシあり | 噛みごたえがあり弾力がある | うどん、餅、glutinous_rice、たこ焼き |
| `tender` | ほろほろ・やわらか | 歯がすっと通る | 長時間煮込み、蒸し鶏、ほぐし豆腐 |
| `creamy` | クリーミー・なめらか | 舌にまったりと広がる | カスタード、ganache、クリームスープ、絹豆腐 |
| `juicy` | 肉汁・果汁が溢れる | 噛むと汁気がでる | 焼き肉、果物、蒸し魚 |
| `crunchy` | シャキシャキ・歯ごたえ | 生野菜・ナッツの硬い歯ごたえ | 生サラダ、ナッツ、きゅうり |
| `fluffy` | ふわふわ・軽い | 空気が入って軽い | 蒸しパン、meringue、スポンジケーキ |
| `none` | 食感がほぼない | 液体・とろみ中心 | スープ、ジュース、プリン（表面のみ） |

`instructions`: "Select the dominant texture/mouthfeel of the finished dish. Consider the ingredients, their amounts, and especially the cooking method and time. Choose the single most characteristic texture. If the dish is mostly liquid with no distinct texture, choose 'none'."

#### 軸 B: 食感の強度（texture_intensity）— `Score` プリミティブ

食感が **どの程度際立っているか** を 5 レベル（0〜4）で評価:

| レベル | 定義（英語） |
|--------|-------------|
| 0 | "No distinct texture; the mouthfeel is neutral or liquid." |
| 1 | "Subtle texture; barely noticeable." |
| 2 | "Noticeable texture; it contributes to the eating experience." |
| 3 | "Prominent texture; it is a key part of the dish's appeal." |
| 4 | "Defining texture; the dish is primarily about its texture (e.g., a crispy snack, a chewy mochi)." |

`instructions`: "Rate how prominent the texture/mouthfeel is in the finished dish, considering the ingredients, amounts, and cooking method."

> **設計判断:** 香りは「強度を主軸・系統を副軸」だが、食感は
> **「系統を主軸・強度を副軸」** にする。理由は、食感の価値は
> 「何が際立っているか」（サクサク vs もちもち）にあり、
> 強度だけでは「揚げ物」と「サラダ」を区別できないため。

### 11.3 Jev リクエスト例（食感 2 軸追加）

既存の味覚 6 軸＋香り 2 軸に、以下の 2 質問を **同一リクエストに追加** する
（TypeSafe は独立質問を並列実行。合計 10 問）:

```json
{
  "texture_profile": {
    "type": "choice",
    "instructions": "Select the dominant texture/mouthfeel of the finished dish. Consider the ingredients, their amounts, and especially the cooking method and time. Choose the single most characteristic texture. If the dish is mostly liquid with no distinct texture, choose 'none'.",
    "options": ["crispy", "chewy", "tender", "creamy", "juicy", "crunchy", "fluffy", "none"]
  },
  "texture_intensity": {
    "type": "score",
    "instructions": "Rate how prominent the texture/mouthfeel is in the finished dish, considering the ingredients, amounts, and cooking method.",
    "criteria": ["No distinct texture...", "Subtle texture...", "Noticeable texture...", "Prominent texture...", "Defining texture..."]
  }
}
```

### 11.4 DB 設計（taste_scores 拡張）

| 列 | 型 | 説明 |
|----|----|------|
| `texture_profile` | TEXT | 主たる食感（crispy / chewy / tender / creamy / juicy / crunchy / fluffy / none） |
| `texture_profile_confidence` | REAL | 0〜1（Choice の確率集中度） |
| `texture_profile_probabilities` | JSONB | 各系統の確率分布（複合食感の表示・分析用） |
| `texture_intensity` | SMALLINT | 0〜100（Jev score × 25） |
| `texture_intensity_confidence` | REAL | 0〜1 |

### 11.5 UI 表示設計

- **レーダーチャート:** 軸は 7（味覚 6＋香り強度）→ **8 軸**（食感強度を追加）に拡張。
  食感の系統（texture_profile）は香りと同じく **バッジ表示**
  （例: 「🍘 サクサク」「🍜 もちもち」「🍮 クリーミー」）。
- **日本語マッピング:** DB には英語キーを保存し、表示層で日本語ラベルへ変換
  （マッピング表は [`frontend/lib/`](../../frontend/lib/) の定数ファイルに
  香り・食感をまとめて 1 ファイルで管理）。
- **低信頼度対策（食感特有）:**
  - confidence < 0.5 の場合は **バッジを非表示**（味覚・香りより厳しめ）。
  - レシピテキストに調理時間・火加減が未記載の場合は、
    編集フォームで「調理時間」入力を促すヒント表示（推定精度向上）。

### 11.6 信頼性向上の対策（食感特有）

| 対策 | 内容 |
|------|------|
| 調理情報の必須化 | レシピ登録・編集時に「調理時間」「火加減」を任意項目として取得し、Jev の state に含める |
| 低信頼度フィルタ | confidence < 0.5 の食感判定はランキングから除外（表示はバッジ非表示） |
| 妥当性検証 | `raw_json`（probabilities）を保存し、人工ラベル（実食評価）との比較で閾値を調整 |
| Epicure 補強（将来） | ゲル化剤・澱粉等の機能性食材のベクトル合成で食感特徴量を補強（PoC 後） |

### 11.7 未確定事項（食感関連）

1. **系統の粒度:** 8 系統は PoC として適切。「ねっとり（viscous）」「シャリシャリ（icy）」
   等の追加は、確率分散による confidence 低下とのトレードオフで判断。
2. **調理情報の取得:** 調理時間・火加減を DB に追加するかどうか
   （`recipes` に `cooking_time_min` / `heat_level` を追加する案）。
   食感判定の精度を上げるには **推奨**。
3. **食感の複数選択:** 香り・食感とも 1 択＋確率分布で表現。
   「サクサク＋もちもち」のような複合食感は確率分布の上位 2 系統で表示。

---

## 12. 調理法（cooking method）の扱い

### 12.1 調査結果：Epicure ベクトルには調理法は含まれない ❌

**結論: 「レシピ共起により調理法の意味がベクトルに現れる」は、本プロジェクトの
Epicure データでは成立しない。**

#### 根拠（vocab.csv 調査）

- [`vocab.csv`](../../backend/data/vocab.csv) の 1,791 項目は **すべて食材・調味料・
  加工食品の名詞** であり、`fried` / `grilled` / `roasted` / `steamed` / `boiled` /
  `baked` / `pickled` / `fermented` 等の **調理法（動詞・分詞）は 1 件も存在しない**
  （調査済み。`barbecue_sauce` / `barbecue_seasoning` は調味料であり調理法ではない）。
- Epicure の 3 種ベクトル（core / cooc / chem）は **食材ノード間の関係**
  （共起・意味・化学的類似）をエンコードしたものであり、
  「食材 × 調理法」の共起は学習対象に含まれていない。
- したがって、**調理法のベクトルは Epicure から取得できない**。
  「fried chicken」と「boiled chicken」を Epicure で区別することはできない
  （`chicken` のベクトルは 1 つだけ）。

#### 補足：Epicure が「間接的に」調理法の影響を反映し得るケース

- `smoked_salmon` / `smoked_meat` / `black_garlic` / `fermented_tofu` /
  `stinky_tofu` / `kimchi` / `sauerkraut` / `natto` のように、
  **調理・加工が商品名に固有名詞化された食材** は vocab に存在する。
  これらは「スモークされた鮭」という **加工済み食材** として独立ノードを持つ。
- ただしこれは「調理法のベクトル」ではなく「加工食品のベクトル」であり、
  任意の食材に任意の調理法を適用した表現（例: 「蒸し鶏」）は得られない。

### 12.2 調理法の判定は Jev が担う ✅

- 調理法は **レシピテキスト（作り方欄）に自然言語で書かれている** ため、
  Jev が英語テキストから判定できる。味覚・香り・食感と同様に
  **Jev の `Choice` プリミティブ** で主たる調理法を選択させる。
- 調理法は **味覚・香り・食感の判定精度を上げる重要なコンテキスト** でもある
  （例: 「2 時間煮込む」→ tender / umami 上昇、「揚げる」→ crispy / smoky 上昇）。
  したがって Jev の state には **必ず作り方欄（instructions_en）を含める**。

### 12.3 調理法の判定軸設計（`Choice` プリミティブ）

主たる調理法を 1 つ選択させる（1 択＋確率分布）。
選択肢はユーザー提示の 8 種＋その他に集約:

| 系統（英語） | 日本語表示 | 説明 |
|--------------|-----------|------|
| `fried` | 揚げ | 油で揚げる（deep fry / shallow fry / stir fry） |
| `grilled` | 焼き | 直火・グリルで焼く |
| `roasted` | ロースト | オーブンでじっくり焼く |
| `steamed` | 蒸し | 蒸気で加熱 |
| `boiled` | 茹で・煮 | 水・湯・スープで加熱（boil / simmer / stew / braise） |
| `baked` | 焼き（オーブン） | 生地・菓子等をオーブンで焼く |
| `pickled` | 漬け | 酢・塩・味噌等で漬ける |
| `fermented` | 発酵 | 発酵させて調理（キムチ・味噌・納豆等） |
| `raw` | 生 | 加熱しない（サラダ・刺身等） |
| `other` | その他 | 上記に該当しない（sous vide・燻製・乾燥等） |

`instructions`: "Select the primary cooking method of the finished dish based on the instructions. Choose the single dominant method. If the dish is uncooked, choose 'raw'. If it does not fit any category, choose 'other'."

> **設計判断:** 調理法はレーダーチャートの軸にはしない（強度概念がない）。
> **バッジ表示**（例: 「🔥 揚げ」「♨️ 蒸し」）とし、
> 確率分布の上位 2 種で「揚げ＋焼き」のような複合調理も表示可能。

### 12.4 DB 設計

- **taste_scores には入れない。** 調理法は評価結果ではなく **レシピの属性** である。
- `recipes` テーブルに以下を追加:

| 列 | 型 | 説明 |
|----|----|------|
| `cooking_method` | TEXT | 主たる調理法（fried / grilled / roasted / steamed / boiled / baked / pickled / fermented / raw / other） |
| `cooking_method_source` | TEXT | `user`（ユーザー入力）/ `jev`（Jev 推定） |
| `cooking_method_confidence` | REAL | Jev 推定時の confidence（user 入力は NULL） |

- **優先順位:** ユーザーが明示的に調理法を選択した場合は `user` 値を優先。
  未入力の場合は Jev 推定値を補完（`cooking_method_source = 'jev'`）。
- 確率分布は `taste_scores.raw_json` に Jev 生レスポンスとして保存される。

### 12.5 Jev リクエストへの反映

- 既存の 10 問（味覚 6＋香り 2＋食感 2）に **調理法 1 問を追加し合計 11 問**。
- 調理法の判定結果は `taste_scores` ではなく `recipes.cooking_method` に保存
  （評価のたびに上書きせず、ユーザー未変更時のみ Jev 値を補完）。

### 12.6 UI 表示設計

- レシピ詳細・一覧に **調理法バッジ**（「🔥 揚げ」「♨️ 蒸し」等）を表示。
- 検索・フィルタに **調理法フィルタ**（`cooking_method = 'steamed'` 等）を追加可能。
- 日本語マッピングは香り・食感と同じく [`frontend/lib/`](../../frontend/lib/) の
  定数ファイルにまとめる。

### 12.7 未確定事項（調理法関連）

1. **ユーザー入力 UI:** 調理法を登録時に選択させるか（推奨）、
   それとも Jev 推定のみでよいか。
2. **複合調理法の表示:** 「蒸してから焼く」のような 2 段階調理は
   確率分布の上位 2 種で表示（例: 「♨️ 蒸し＋🔥 焼き」）。
3. **Epicure への調理法ノード追加:** 将来的に Epicure ベクトル空間に
   調理法ノードを人工的に追加し「食材×調理法」の類似度を計算する案は、
   学習データが不足しており PoC では **不採用**。

---

## 13. 料理文化（cuisine / cultural style）の扱い

### 13.1 調査結果：文化名ノードは無いが、代表食材は高カバー ⚠️

**結論: 「Japanese」「Chinese」等の文化名ノードは Epicure に存在しないが、
各文化の代表食材が vocab に豊富に存在するため、
『文化方向ベクトル』を代表食材の重心（centroid）として構築可能。**

#### 根拠（vocab.csv 調査）

- **文化名ノードは存在しない:** `japanese` / `chinese` / `korean` / `italian` /
  `french` / `mexican` / `indian` / `mediterranean` / `middle_eastern` 等の
  文化名は vocab に 1 件も存在しない（調査済み）。
  → 「レシピ共起が文化的傾向を強く反映し、文化方向ベクトルが自然に形成される」は、
  **文化名ノードとして直接は成立しない**。
- **ただし各文化の代表食材・調味料・料理名は高カバー**（下表）。
  これらのノードの **ベクトル重心（平均）を計算すれば、
  人工的に「文化方向ベクトル」を構築できる**。

#### 文化別代表食材の vocab カバー状況（調査結果）

| 文化 | vocab に存在する代表食材・調味料・料理名 | カバー評価 |
|------|----------------------------------------|-----------|
| 日本（Japanese） | `miso` / `dashi` / `bonito` / `bonito_flakes` / `kombu` / `nori` / `wakame` / `aonori` / `soy_sauce` / `dark_soy_sauce` / `light_soy_sauce` / `white_soy_sauce` / `mirin` / `sake` / `rice_vinegar` / `wasabi` / `perilla` / `perilla_oil` / `sansho_pepper` / `yuzu` / `yuzu_kosho` / `mitsuba` / `senbei` / `kinako` / `tenkasu` / `tofu` / `rice_tofu` / `fermented_tofu` / `stinky_tofu` / `mapo_tofu_sauce` / `teriyaki_sauce` / `donburi_sauce` / `shichimi`（※要確認） | ◎ 高 |
| 中国（Chinese） | `soy_sauce` / `hoisin`（※要確認）/ `oyster_sauce` / `five_spice`（※要確認）/ `star_anise` / `sichuan`（※要確認）/ `wonton` / `dumpling` / `dumpling_wrapper` / `rice_noodle` / `liangpi` / `shaobing` / `youtiao` / `mapo_tofu_sauce` / `mapo`（※要確認）/ `tofu` / `scallion` / `ginger` / `garlic` / `black_vinegar` / `rice_wine` / `baijiu` / `bai_ji_mo` | ○ 中〜高 |
| 韓国（Korean） | `gochujang` / `gochugaru` / `ssamjang` / `doenjang` / `bulgogi` / `buldak_sauce` / `kimchi` / `budae_jjigae_base` / `ssam`（※要確認） | ◎ 高 |
| イタリア（Italian） | `pasta` / `pasta_sauce` / `marinara_sauce` / `ravioli` / `tortellini` / `gnocchi` / `semolina` / `arborio`（※要確認）/ `parmesan_cheese` / `pecorino_cheese` / `mozzarella`（※要確認）/ `olive_oil` / `olive` / `basil` / `oregano` / `ciabatta` / `focaccia`（※要確認）/ `balsamic`（※要確認） | ○ 中〜高 |
| フランス（French） | `butter` / `cream` / `cream_cheese` / `brie`（※要確認）/ `camembert`（※要確認）/ `comte`（※要確認）/ `gruyere_cheese` / `foie_gras` / `baguette`（※要確認）/ `croissant` / `puff_pastry` / `phyllo_dough` / `bouquet_garni` / `mirepoix` / `rouille` / `sherry` / `cognac` / `brandy` | ○ 中〜高 |
| メキシコ（Mexican） | `corn_tortilla` / `flour_tortilla` / `tortilla` / `guacamole` / `salsa` / `salsa_verde` / `mole` / `huitlacoche` / `fajita_seasoning` / `guajillo_chile` / `ancho_chile` / `cascabel_chile` / `chipotle`（※要確認）/ `tajin` / `cumin` / `achiote_paste` / `masa_harina` | ◎ 高 |
| インド（Indian） | `curry` / `curry_powder` / `curry_paste` / `curry_leaf` / `garam_masala` / `goda_masala` / `paneer` / `chickpea` / `chickpea_flour`（besan）/ `lentil` / `turmeric` / `cumin` / `coriander` / `cardamom` / `cinnamon` / `cloves` / `mace` / `asafoetida` / `amchur` / `fenugreek` / `naan` / `roti` / `tandoori`（※要確認） | ◎ 高 |
| 地中海（Mediterranean） | `olive_oil` / `olive` / `black_olive` / `lemon` / `garlic` / `basil` / `oregano` / `thyme` / `rosemary` / `parsley` / `feta`（※要確認）/ `halloumi`（※要確認）/ `hummus` / `chickpea` / `pita`（※要確認）/ `tabbouleh`（※要確認）/ `bulgur` / `sumac` / `zaatar` / `tahini` / `capers`（※要確認） | ○ 中〜高 |
| 中東（Middle Eastern） | `hummus` / `falafel` / `pita`（※要確認）/ `zaatar` / `sumac` / `tahini` / `chickpea` / `olive_oil` / `olive` / `lemon` / `garlic` / `cumin` / `coriander` / `cardamom` / `saffron` / `rosewater` / `orange_blossom_water` / `pomegranate`（※要確認）/ `bulgur` / `freekeh` / `ouzo` | ○ 中〜高 |

> **注:** 「※要確認」は本調査で vocab 存在を確認していない項目。
> 実装時に `epicure_loader` で各文化の代表食材リストを vocab と照合し、
> 存在しない食材は除外して重心を計算する（フォールバック設計）。

### 13.2 文化方向ベクトルの構築方法（Epicure 活用）

**手法: 代表食材のベクトル重心（centroid）を「文化方向ベクトル」とする。**

```
cuisine_vector[cuisine] = mean( epicure_core_vector[ingredient]
                                for ingredient in representative_ingredients[cuisine]
                                if ingredient in vocab )
```

- **代表食材リスト:** 文化ごとに 10〜30 食材を [`backend/data/`](../../backend/data/)
  に JSON/YAML として配置（例: `cuisine_ingredients.json`）。
  ハードコードではなくデータファイルで管理し、追加・修正を容易にする。
- **使用ベクトル:** `epicure_core.csv`（意味的類似）を主軸。
  必要に応じて `epicure_cooc.csv`（共起）を重み付け合成。
- **レシピの文化類似度:**
  ```
  similarity(recipe, cuisine) = cosine(
      weighted_sum( ingredient_vectors ),   # レシピの食材ベクトル（分量重み付き）
      cuisine_vector[cuisine]               # 文化方向ベクトル
  )
  ```
- **用途:**
  1. **文化の自動推定補助:** Jev の文化判定（§13.3）と Epicure の類似度を
     組み合わせ、信頼度を補強（両者が一致すれば confidence 上昇）。
  2. **文化別検索・フィルタ:** 「和食に似たレシピ」の類似度検索。
  3. **Qwen 生成の制約:** 「和食風で生成」の指示を Qwen に渡す際の
     代表食材リストの参照源。

### 13.3 料理文化の判定軸設計（Jev `Choice` プリミティブ）

- 文化名ノードが Epicure に無いため、**主判定は Jev の英語テキスト推定**。
- 主たる料理文化を 1 つ選択させる（1 択＋確率分布）:

| 系統（英語） | 日本語表示 |
|--------------|-----------|
| `japanese` | 和食 |
| `chinese` | 中華 |
| `korean` | 韓国料理 |
| `italian` | イタリア料理 |
| `french` | フランス料理 |
| `mexican` | メキシコ料理 |
| `indian` | インド料理 |
| `mediterranean` | 地中海料理 |
| `middle_eastern` | 中東料理 |
| `thai` | タイ料理 |
| `vietnamese` | ベトナム料理 |
| `western` | 洋食（その他） |
| `fusion` | フュージョン・その他 |

`instructions`: "Select the primary culinary culture/cuisine of the finished dish based on the ingredients and cooking method. Choose the single dominant cuisine. If the dish blends multiple cuisines or does not fit any, choose 'fusion'."

> **設計判断:** 文化はレーダー軸にもバッジの「系統」にも該当しない
> **レシピの属性**（ジャンル）であり、既存の `recipes.genre`
> （和食・中華・洋食・スイーツ）を **英語キーの 13 分類に拡張** する。

### 13.4 DB 設計

- `recipes.genre` を **英語キーの 13 分類** に拡張（既存の日本語 4 分類から移行）:

| 列 | 型 | 説明 |
|----|----|------|
| `genre` | TEXT | 料理文化（japanese / chinese / korean / italian / french / mexican / indian / mediterranean / middle_eastern / thai / vietnamese / western / fusion） |
| `genre_source` | TEXT | `user`（ユーザー入力）/ `jev`（Jev 推定） |
| `genre_confidence` | REAL | Jev 推定時の confidence（user 入力は NULL） |

- **マイグレーション:** 既存の `genre`（和食・中華・洋食・スイーツ）は
  Alembic マイグレーションで英語キーへ変換（和食→japanese、中華→chinese、
  洋食→western、スイーツ→fusion）。
- **日本語表示:** 表示層で `japanese → 和食` 等へマッピング
  （[`frontend/lib/`](../../frontend/lib/) の定数ファイル）。
- **Epicure 類似度:** `taste_scores` に `cuisine_similarity_json`（JSONB）を
  追加し、各文化との cosine 類似度を保存（検索・分析用）。

### 13.5 Jev リクエストへの反映

- 既存の 11 問（味覚 6＋香り 2＋食感 2＋調理法 1）に **文化 1 問を追加し合計 12 問**。
- 文化の判定結果は `taste_scores` ではなく `recipes.genre` に保存
  （ユーザー未変更時のみ Jev 値を補完）。

### 13.6 UI 表示設計

- レシピ詳細・一覧に **文化バッジ**（「🍣 和食」「🥘 中華」等）を表示。
- 検索・フィルタに **文化フィルタ**（`genre = 'japanese'` 等）を追加
  （既存の `genre` パラメータを英語キーに拡張）。
- **文化類似度バー:** レシピ詳細に「和食度 82% / 中華度 15%」のような
  類似度バーを表示（`cuisine_similarity_json` を使用）。
- 日本語マッピングは香り・食感・調理法と同じく
  [`frontend/lib/`](../../frontend/lib/) の定数ファイルにまとめる。

### 13.7 未確定事項（料理文化関連）

1. **代表食材リストの整備:** 各文化 10〜30 食材のリスト作成は
   ドメイン知識が必要。PoC では 8 文化（ユーザー提示分）に絞り、
   各 15 食材程度で開始する。
2. **genre の既存データ移行:** 日本語 4 分類 → 英語 13 分類の
   マイグレーション方針（スイーツ→fusion の妥当性要確認）。
3. **文化の複数選択:** 「和洋折衷」のような複合文化は
   確率分布の上位 2 種で表示（例: 「🍣 和食＋🥐 洋食」）。
4. **Epicure 文化重心の妥当性検証:** 重心ベクトルの類似度が
   人工ラベル（レシピの実際の文化）と一致するか、
   PoC 段階で 20〜30 レシピのサンプルで検証する。

---

## 14. 用途（culinary function）の扱い

### 14.1 調査結果：用途名ノードは無いが、代表食材は高カバー ⚠️

**結論: 「thickener」「sweetener」等の用途名ノードは Epicure に存在しないが、
各用途の代表食材が vocab に高カバーで存在するため、
『用途方向ベクトル』を代表食材の重心（centroid）として構築可能。
さらに用途は食材の属性であるため、静的な分類表で決定論的に表現できる。**

#### 根拠（vocab.csv 調査）

- **用途名ノードは存在しない:** `thickener` / `sweetener` / `souring_agent` /
  `umami_booster` / `aromatic_base` / `fat_source` 等の用途名は vocab に
  1 件も存在しない（調査済み）。文化名（§13.1）と同様、
  「レシピ共起が用途傾向を反映し、用途方向ベクトルが自然に形成される」は
  **用途名ノードとして直接は成立しない**。
- **ただし各用途の代表食材は vocab に高カバー**（下表）。
  これらのノードの **ベクトル重心を計算すれば、
  人工的に「用途方向ベクトル」を構築できる**。

#### 用途別代表食材の vocab カバー状況（調査結果）

| 用途 | vocab に存在する代表食材 | カバー評価 |
|------|--------------------------|-----------|
| とろみ付け（thickener） | `starch` / `cornstarch` / `arrowroot` / `tapioca` / `tapioca_pearl` / `sago` / `flour` / `glutinous_rice_flour` / `gelatin` / `agar` / `pectin` / `guar_gum` / `glycerin` | ◎ 高 |
| 甘味（sweetener） | `sugar` / `brown_sugar` / `honey` / `maple_syrup` / `molasses` / `corn_syrup` / `coconut_sugar` | ◎ 高 |
| 酸味（souring agent） | `vinegar` / `rice_vinegar` / `black_vinegar` / `balsamic_vinegar` / `sherry_vinegar` / `apple_cider_vinegar` / `lemon` / `lime` / `yuzu` / `tamarind` | ◎ 高 |
| 旨味（umami booster） | `soy_sauce` / `dark_soy_sauce` / `miso` / `dashi` / `bonito` / `bonito_flakes` / `kombu` / `oyster_sauce` / `fish_sauce` / `msg` / `parmesan_cheese` / `anchovy` | ◎ 高 |
| 香味（aromatic base） | `garlic` / `onion` / `scallion` / `ginger` / `shallot` / `leek` / `garlic_chive` / `scallion_oil` | ◎ 高 |
| 脂質（fat source） | `butter` / `olive_oil` / `lard` / `coconut_oil` / `sesame_oil` / `ghee` / `palm_oil` / `sunflower_oil` / `canola_oil` / `vegetable_oil` / `cream` / `suet` | ◎ 高 |

> **注:** 用途は文化（§13）と異なり **6 用途すべてが ◎ 高カバー** である。
> 理由は、用途を構成するのは「文化特有の希少食材」ではなく
> 「世界中の料理で共通して使われる基礎食材・調味料」であり、
> Epicure の vocab（1,791 食材）がこれらを網羅しているため。

### 14.2 設計方針：文化（§13）との決定的な違い

| 観点 | 料理文化（§13） | 用途（§14） |
|------|----------------|-------------|
| 属性の単位 | **レシピ**（1 レシピ → 主たる文化 1 つ） | **食材**（1 レシピ → 複数用途が同時に存在） |
| 主判定手段 | Jev `Choice`（テキスト推定） | **静的分類表（決定論的）**＋Epicure 類似度 |
| Jev の役割 | 主判定 | 不要（将来のクロス検証のみ） |
| 保存先 | `recipes.genre`（レシピ属性） | 保存しない（**オンザフライ計算**、§14.5） |

**方針:**
1. **食材→用途の分類は静的データファイルで管理する**（§14.3）。
   用途は食品科学的に明確な属性であり、LLM 推定に頼る必要がない。
   決定論的であるため再現性・コスト・レイテンシの面で有利。
2. **レシピレベルの用途プロファイルは、食材の用途を分量重みで集約して
   サービス層で計算する**（§14.4）。
3. **Jev の 12 問（§13.5）には用途の質問を追加しない**。
   用途は Jev 判定対象外とする（コスト増の対価が得られないため）。

### 14.3 データファイル設計：function_ingredients.json

文化の代表食材リスト（§13.2 `cuisine_ingredients.json`）と同様に、
用途ごとの代表食材を [`backend/data/`](../../backend/data/) に配置
（`function_ingredients.json`）。ハードコードではなくデータファイルで管理する。

```json
{
  "thickener": ["starch", "cornstarch", "arrowroot", "tapioca", "tapioca_pearl", "sago", "flour", "glutinous_rice_flour", "gelatin", "agar", "pectin", "guar_gum"],
  "sweetener": ["sugar", "brown_sugar", "honey", "maple_syrup", "molasses", "corn_syrup", "coconut_sugar"],
  "souring_agent": ["vinegar", "rice_vinegar", "black_vinegar", "balsamic_vinegar", "sherry_vinegar", "apple_cider_vinegar", "lemon", "lime", "yuzu", "tamarind"],
  "umami_booster": ["soy_sauce", "dark_soy_sauce", "miso", "dashi", "bonito", "bonito_flakes", "kombu", "oyster_sauce", "fish_sauce", "msg", "parmesan_cheese", "anchovy"],
  "aromatic_base": ["garlic", "onion", "scallion", "ginger", "shallot", "leek", "garlic_chive"],
  "fat_source": ["butter", "olive_oil", "lard", "coconut_oil", "sesame_oil", "ghee", "palm_oil", "sunflower_oil", "canola_oil", "vegetable_oil", "cream", "suet"]
}
```

- **1 食材が複数用途に属し得る**（例: `butter` は fat_source かつ
  aromatic_base、`honey` は sweetener かつ aromatic_base）。
  分類表は「食材 → 用途の集合」を表現する。
- **vocab 照合フォールバック:** 読み込み時に `epicure_loader` が各食材を
  vocab と照合し、存在しない食材は除外して重心を計算する（§13.2 と同一）。

### 14.4 用途方向ベクトルとレシピ用途プロファイル（Epicure 活用）

**用途方向ベクトル:** §13.2 と同一の重心手法。

```
function_vector[function] = mean( epicure_core_vector[ingredient]
                                  for ingredient in function_ingredients[function]
                                  if ingredient in vocab )
```

**レシピ用途プロファイル:**

```
profile[function] = cosine(
    weighted_sum( ingredient_vectors ),   # レシピの食材ベクトル（分量重み付き）
    function_vector[function]             # 用途方向ベクトル
)
```

- 分量が NULL の食材は個数重み（1.0）で扱う。
- cosine は [-1, 1] のため、表示用に `(sim + 1) / 2 × 100 → 0〜100` に変換。

**用途:**
1. **レシピ診断:** 「umami_booster が低い」→ 味噌・出汁の追加を提案
   （UC-10 改善ループ最適化と連携。Qwen に「旨味を強化せよ」の指示を
   数値根拠付きで渡せる）。
2. **代替食材提案の絞り込み:** 某食材の代替を Epicure 類似度検索する際、
   **同一用途方向の類似度で加重**（例: とろみ付け材の代替は
   thickener 方向の類似度が高い候補を優先）。
3. **味覚軸の補完:** 味覚 5 軸（§2.1）には **「酸味（sour）」の軸がない**。
   `souring_agent` プロファイルは酸味の代理指標として機能し、
   レーダーチャートの盲点を補う。

### 14.5 DB 設計：保存しない（オンザフライ計算）

- **`recipes` / `taste_scores` に用途の列は追加しない。**
- 用途プロファイルは「`recipe_ingredients`（`epicure_node_id` 解決済み）
  ＋ `function_ingredients.json`」から **決定論的に再計算可能** であり、
  DB に保存するとレシピ編集時のデータ不整合（stale data）リスクが生じる。
- したがって **API 呼び出し時にサービス層で計算して返却する**。
  計算コストは 6 用途 × 300 次元の cosine であり、PoC 規模では無視できる。
- **将来（ランキング・フィルタの需要が出た場合）:**
  `taste_scores.function_profile_json`（JSONB）に評価時点のスナップショットを
  保存する拡張余地を残す（マイグレーションは後付けで十分）。

### 14.6 API 設計

- **GET /api/recipes/{id}:** レスポンスに `function_profile` を追加。

```json
{
  "function_profile": {
    "thickener": 12, "sweetener": 45, "souring_agent": 8,
    "umami_booster": 71, "aromatic_base": 63, "fat_source": 38
  }
}
```

- **GET /api/recipes/search:** `function` パラメータ（例: `?function=umami_booster&min=50`）
  で「旨味の強いレシピ」等のフィルタを追加可能。
  PoC ではレシピ数が少ないため、オンザフライ計算後のメモリ内フィルタで実現
  （DB インデックス不要）。

### 14.7 UI 表示設計

- **レーダーチャートには軸を追加しない**（既に 8 軸。用途は感覚属性ではなく
  構成プロファイルであるため）。
- レシピ詳細に **用途プロファイルバー**（6 本の横バー、
  「旨味 71 / 香味 63 / 甘味 45 / 脂質 38 / とろみ 12 / 酸味 8」）を表示。
- **診断バッジ:** 最低値の用途が閾値（例: 20）未満の場合、
  「旨味が弱い → 味噌・出汁の追加を提案」のようなヒント表示（UC-10 連携）。
- **日本語マッピング:** `thickener → とろみ付け` / `sweetener → 甘味` /
  `souring_agent → 酸味` / `umami_booster → 旨味` / `aromatic_base → 香味` /
  `fat_source → 脂質`。香り・食感・調理法・文化と同じく
  [`frontend/lib/`](../../frontend/lib/) の定数ファイルにまとめる。

### 14.8 Jev との関係

- **Jev の 12 問（§13.5）には用途の質問を追加しない。**
  用途は静的分類表＋Epicure 類似度で決定論的に表現できるため、
  LLM 推定のコスト・レイテンシ・非再現性の対価が得られない。
- **将来のクロス検証（任意）:** Jev の `Noul` プリミティブで
  「このレシピのとろみ付けの役割は顕著か？」等の yes/no 質問を並列し、
  静的分類表の妥当性を検証する案がある（PoC では不採用）。

### 14.9 未確定事項（用途関連）

1. **用途の追加:** 6 用途はユーザー提示分。`spice`（辛味源）/
   `coloring`（着色）/ `preservative`（保存）等の追加は分類表の
   JSON 追記だけで可能だが、PoC では 6 用途で開始する。
2. **重み付け方式:** 分量重み（g 換算）と個数重みの併用。
   分量 NULL 時の扱い（個数重み 1.0）は PoC として十分。
3. **分類表の整備:** 各用途 10〜15 食材のリストは食品科学的に
   明確だが、境界食材（例: `coconut_milk` は fat_source か？）の
   所属判断は実装時に確定する。
4. **酸味軸との関係:** 味覚 5 軸に「酸味（sour）」がないため、
   `souring_agent` を酸味の代理指標として使う。将来的に Jev の
   味覚軸に `sour` を追加する場合（§9.2 の粒度検討と同時）、
   両者の相関を `raw_json` とプロファイルで検証する。

---

## 15. 栄養的特徴（Nutritional Profile）の扱い

### 15.1 評価：6 属性中 4 属性が静的分類表＋Epicure 方向ベクトルで表現可能 ⚠️

**結論: `high-fat` / `high-protein` / `high-carb` / `fiber-rich` は
『静的分類表（決定論的）＋ Epicure chem 方向ベクトル』で表現可能。
`low-calorie` は独立軸ではなく **派生指標**（§15.3）。
`vitamin-rich` は chem ベクトル上のシグナルが弱く、静的分類表を主軸とする。**

> **前提の整理:** ユーザー提示の「FlavorDB の化学成分＋レシピ共起」は、
> 本プロジェクトの **Epicure `epicure_chem.csv`（化学成分由来）＋
> `epicure_cooc.csv`（レシピ共起由来）** に相当する。
> Epicure の chem ベクトルは化学成分（脂質・タンパク質・炭水化物・食物繊維等）を
> エンコードするため、栄養的意味が **ある程度** 表現されるという主張は妥当。
> ただし **完全な栄養データ（kcal/g、g/100g 等）ではない** 点に注意。

#### 根拠（vocab.csv 調査）

- **栄養属性名ノードは存在しない:** `high_fat` / `high_protein` / `high_carb` /
 `low_calorie` / `fiber_rich` / `vitamin_rich` 等は vocab に
 1 件も存在しない（§13.1 / §14.1 と同様）。
- **ただし各栄養属性の代表食材は vocab に高カバー**（下表）。
 これらのノードの **ベクトル重心を計算すれば、
 人工的に「栄養方向ベクトル」を構築できる**。
- **Epicure chem ベクトルの役割:**
 化学成分（脂質・タンパク質・炭水化物・食物繊維）をエンコードするため、
 宏量栄養素（high-fat / high-protein / high-carb / fiber-rich）は
 方向ベクトルとして表現可能。
- **Epicure cooc ベクトルの役割:**
 レシピ共起をエンコードするため、「高脂質レシピで共起する食材」
 （butter, cream, cheese 等）が同方向にクラスター化される。
- **限界:**
 - `low-calorie` は「方向」ではなく「領域」（複数軸の低値）であり、
   単一の重心方向では表現できない（§15.3 で派生指標として扱う）。
 - `vitamin-rich` は微量栄養素（mg/µg 単位）であり、
   chem ベクトル上のシグナルが宏量栄養素より弱い。
 - **完全な栄養データではない。** 意味的傾向（0〜100）であり、
   「このレシピは高脂質傾向（72/100）」のような相対評価のみ。

#### 栄養属性別代表食材の vocab カバー状況（調査結果）

| 属性 | vocab に存在する代表食材 | カバー評価 |
|------|--------------------------|-----------|
| high-fat | `butter` / `olive_oil` / `coconut_oil` / `cream` / `cheese` / `avocado` / `lard` / `ghee` / `egg` / `salmon` / `almond` / `walnut` / `peanut` / `coconut_milk` / `buttercream` | ◎ 高 |
| high-protein | `beef` / `chicken` / `pork` / `salmon` / `tofu` / `tempeh` / `lentil` / `chickpea` / `egg` / `soybean` / `edamame` / `quinoa` / `nutritional_yeast` / `black_bean` / `kidney_bean` / `fava_bean` | ◎ 高 |
| high-carb | `rice` / `bread` / `pasta` / `potato` / `sweet_potato` / `corn` / `wheat` / `flour` / `sugar` / `honey` / `banana` / `plantain` / `glutinous_rice` / `tapioca` / `cassava` / `oat` | ◎ 高 |
| fiber-rich | `oat` / `brown_rice` / `quinoa` / `barley` / `bulgur` / `flaxseed` / `chia_seed` / `psyllium_husk` / `broccoli` / `brussels_sprout` / `kale` / `carrot` / `apple` / `pear` / `lentil` / `chickpea` / `black_bean` / `seaweed` / `kelp` | ◎ 高 |
| vitamin-rich | `kale` / `spinach` / `broccoli` / `bell_pepper` / `carrot` / `sweet_potato` / `lemon` / `orange` / `kiwi` / `strawberry` / `nutritional_yeast` / `mango` / `papaya` / `guava` | ○ 中 |
| low-calorie | （独立軸ではない — 派生指標、§15.3 参照） | — |

> **注:** 1 食材が複数属性に属し得る（例: `salmon` は high-fat かつ high-protein、
> `oat` は high-carb かつ fiber-rich）。分類表は「食材 → 属性の集合」を表現する。

### 15.2 設計方針：用途（§14）と同一パターン

| 観点 | 用途（§14） | 栄養的特徴（§15） |
|------|------------|------------------|
| 属性の単位 | **食材**（1 レシピ → 複数用途） | **食材**（1 レシピ → 複数栄養属性） |
| 主判定手段 | 静的分類表（決定論的）＋Epicure 類似度 | **静的分類表（決定論的）＋Epicure 類似度** |
| 使用ベクトル | `epicure_core.csv`（意味的類似） | **`epicure_chem.csv`（化学成分）** |
| Jev の役割 | 不要 | 不要 |
| 保存先 | 保存しない（オンザフライ計算） | 保存しない（オンザフライ計算） |

**方針:**
1. **食材→栄養属性の分類は静的データファイルで管理する**（§15.4）。
  栄養的性質は食品科学的に明確な属性（USDA FoodData Central 等で
  文書化されている）であり、LLM 推定に頼る必要がない。
2. **レシピレベルの栄養プロファイルは、食材の栄養属性を分量重みで集約して
  サービス層で計算する**（§15.5）。
3. **Jev の 12 問（§13.5）には栄養の質問を追加しない**。
4. **`low-calorie` は独立軸ではなく派生指標**（§15.3）。

### 15.3 low-calorie：派生指標（独立軸ではない）

`low-calorie` はベクトル空間上の「方向」ではなく
**「複数宏量栄養素軸の低値領域」** であり、
単一の重心方向では表現できない。
したがって、他の 4 プロファイルから **派生** する:

```
low_calorie_score = 100 - (0.4 × high_fat + 0.3 × high_carb + 0.3 × high_protein)
```

- **重みの根拠:** 脂質 9 kcal/g > 炭水化物 4 kcal/g ≈ タンパク質 4 kcal/g。
 脂質のカロリー寄与が 2.25 倍であるため 0.4 を割り当てる。
- **これはヒューリスティックであり、正確な kcal 計算ではない。**
 「意味的傾向」（0〜100）として扱う。
- **既知の限界:**
 - 「高タンパク＋低脂質＋低炭水化物」（例: 鶏むね肉の焼き物）→
   low_calorie_score 高（正しい）。
 - 「高炭水化物＋低脂質＋低タンパク質」（例: 白米のみ）→
   low_calorie_score 中程度（「軽さ」の意味では不正確だが、
   宏量栄養素の絶対量としては妥当）。
- **PoC 方針:** このヒューリスティックを受け入れ、
 UI に「低カロリー傾向（ヒューリスティック）」と注記表示する。

### 15.4 データファイル設計：nutrition_ingredients.json

文化（§13.2）・用途（§14.3）と同様に、
栄養属性ごとの代表食材を [`backend/data/`](../../backend/data/) に配置
（`nutrition_ingredients.json`）。ハードコードではなくデータファイルで管理する。

```json
{
 "high_fat": ["butter", "olive_oil", "coconut_oil", "cream", "cheese", "avocado", "lard", "ghee", "egg", "salmon", "almond", "walnut", "peanut", "coconut_milk", "buttercream"],
 "high_protein": ["beef", "chicken", "pork", "salmon", "tofu", "tempeh", "lentil", "chickpea", "egg", "soybean", "edamame", "quinoa", "nutritional_yeast", "black_bean", "kidney_bean", "fava_bean"],
 "high_carb": ["rice", "bread", "pasta", "potato", "sweet_potato", "corn", "wheat", "flour", "sugar", "honey", "banana", "plantain", "glutinous_rice", "tapioca", "cassava", "oat"],
 "fiber_rich": ["oat", "brown_rice", "quinoa", "barley", "bulgur", "flaxseed", "chia_seed", "psyllium_husk", "broccoli", "brussels_sprout", "kale", "carrot", "apple", "pear", "lentil", "chickpea", "black_bean", "seaweed", "kelp"],
 "vitamin_rich": ["kale", "spinach", "broccoli", "bell_pepper", "carrot", "sweet_potato", "lemon", "orange", "kiwi", "strawberry", "nutritional_yeast", "mango", "papaya", "guava"]
}
```

- **vocab 照合フォールバック:** 読み込み時に `epicure_loader` が各食材を
 vocab と照合し、存在しない食材は除外して重心を計算する（§13.2 / §14.3 と同一）。

### 15.5 栄養方向ベクトルとレシピ栄養プロファイル（Epicure 活用）

**栄養方向ベクトル:** §13.2 / §14.4 と同一の重心手法。
ただし **`epicure_chem.csv`（化学成分）を主軸** にする
（§13 / §14 が `epicure_core.csv` を使うのに対し、
栄養は化学的性質であるため chem ベクトルが適切）。

```
nutrition_vector[attribute] = mean( epicure_chem_vector[ingredient]
                                   for ingredient in nutrition_ingredients[attribute]
                                   if ingredient in vocab )
```

- 必要に応じて `epicure_cooc.csv`（共起）を重み付け合成。

**レシピ栄養プロファイル:**

```
profile[attribute] = cosine(
   weighted_sum( ingredient_vectors ),   # レシピの食材ベクトル（分量重み付き）
   nutrition_vector[attribute]           # 栄養方向ベクトル
)
```

- 分量が NULL の食材は個数重み（1.0）で扱う（§14.4 と同一）。
- cosine は [-1, 1] のため、表示用に `(sim + 1) / 2 × 100 → 0〜100` に変換。
- `low_calorie` は §15.3 の派生式で計算。

**用途:**
1. **レシピ診断:** 「high_protein が低い」→ 豆腐・鶏肉等の追加を提案
  （UC-10 改善ループ最適化と連携。Qwen に「タンパク質を強化せよ」の指示を
  数値根拠付きで渡せる）。
2. **栄養類似度検索:** 「高タンパクなレシピに栄養的に似たレシピ」の検索。
3. **Qwen 生成の制約:** 「高タンパク・低脂質で生成」の指示を Qwen に渡す際の
  代表食材リストの参照源。
4. **味覚軸の補完:** 味覚 5 軸（§2.1）には栄養的観点がない。
  栄養プロファイルは「このレシピは栄養的にどのような傾向か」を
  感覚属性（味覚・香り・食感）と独立に表現する。

### 15.6 DB 設計：保存しない（オンザフライ計算）

- **`recipes` / `taste_scores` に栄養の列は追加しない。**
- 栄養プロファイルは「`recipe_ingredients`（`epicure_node_id` 解決済み）
 ＋ `nutrition_ingredients.json`」から **決定論的に再計算可能** であり、
 DB に保存するとレシピ編集時のデータ不整合（stale data）リスクが生じる。
- したがって **API 呼び出し時にサービス層で計算して返却する**。
 計算コストは 5 属性 × 300 次元の cosine ＋ 1 派生指標であり、
 PoC 規模では無視できる。
- **将来（ランキング・フィルタの需要が出た場合）:**
 `taste_scores.nutrition_profile_json`（JSONB）に評価時点のスナップショットを
 保存する拡張余地を残す（マイグレーションは後付けで十分）。

### 15.7 API 設計

- **GET /api/recipes/{id}:** レスポンスに `nutrition_profile` を追加。

```json
{
 "nutrition_profile": {
   "high_fat": 72, "high_protein": 45, "high_carb": 30,
   "fiber_rich": 15, "vitamin_rich": 20, "low_calorie": 55
 }
}
```

- **GET /api/recipes/search:** `nutrition` パラメータ
 （例: `?nutrition=high_protein&min=50`）で
 「高タンパクなレシピ」等のフィルタを追加可能。
 PoC ではレシピ数が少ないため、オンザフライ計算後のメモリ内フィルタで実現
 （DB インデックス不要）。

### 15.8 UI 表示設計

- **レーダーチャートには軸を追加しない**（既に 8 軸。栄養は感覚属性ではなく
 構成プロファイルであるため、§14 と同様）。
- レシピ詳細に **栄養プロファイルバー**（6 本の横バー、
 「高脂質 72 / 高タンパク 45 / 高炭水化物 30 / 低カロリー 55 /
 高食物繊維 15 / 高ビタミン 20」）を表示。
- **診断バッジ:** 最低値の栄養属性が閾値（例: 20）未満の場合、
 「タンパク質が弱い → 豆腐・鶏肉の追加を提案」のようなヒント表示
 （UC-10 連携）。
- **免責表示:** 「これは完全な栄養データではなく、意味的傾向です」の
 注記をプロファイルバーの下部に表示。
- **日本語マッピング:** `high_fat → 高脂質` / `high_protein → 高タンパク` /
 `high_carb → 高炭水化物` / `low_calorie → 低カロリー` /
 `fiber_rich → 高食物繊維` / `vitamin_rich → 高ビタミン`。
 香り・食感・調理法・文化・用途と同じく
 [`frontend/lib/`](../../frontend/lib/) の定数ファイルにまとめる。

### 15.9 Jev との関係

- **Jev の 12 問（§13.5）には栄養の質問を追加しない。**
 栄養は静的分類表＋Epicure 類似度で決定論的に表現できるため、
 LLM 推定のコスト・レイテンシ・非再現性の対価が得られない。
- **将来のクロス検証（任意）:** Jev の `Noul` プリミティブで
 「このレシピは高タンパク質か？」等の yes/no 質問を並列し、
 静的分類表の妥当性を検証する案がある（PoC では不採用）。

### 15.10 未確定事項（栄養関連）

1. **静的分類表の整備:** 各属性 10〜20 食材のリストは食品科学的に
  明確だが、境界食材（例: `coconut_milk` は high_fat か high_carb か？
  `avocado` は high_fat か fiber_rich か？）の所属判断は実装時に確定する。
2. **low-calorie ヒューリスティックの重み:** 0.4/0.3/0.3 はヒューリスティック。
  PoC 段階で実際の kcal データ（USDA FoodData Central 等）と
  20〜30 レシピのサンプルで相関を検証し、必要に応じて重みを調整する。
3. **vitamin-rich のシグナル強度:** 微量栄養素（ビタミン）の
  chem ベクトル上のシグナルは宏量栄養素より弱い。
  Epicure 類似度の寄与が低い場合は、vitamin_rich のみ
  静的分類表のみで計算する（Epicure 類似度を無視）案もある。
4. **Epicure chem ベクトルの栄養的妥当性検証:**
  重心ベクトルの類似度が実際の栄養データ（USDA 等）と一致するか、
  PoC 段階で 20〜30 レシピのサンプルで検証する。
  相関が低い場合は、静的分類表のみで計算するフォールバックに切り替える。
