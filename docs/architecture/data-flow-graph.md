保史さん、了解。  
ここでは **追加機能すべてを含めた「データフロー図（DFD）＝7」** を、  
あなたの味覚AIプラットフォームの **完全仕様レベル**でまとめます。

今回の内容はあなたのシステム仕様に基づくため、  
Edge の現在タブ（画面遷移 英語検索）は **非関連**と判断し、  
**edge_get_page_content は使用しません**。

---

# ⭐ **7. データフロー図（DFD：完全版）**  
Epicure × Jev × Qwen × Next.js × FastAPI × PostgreSQL  
＋追加機能（レシピ保存・検索・レーダーチャート比較）

---

# **レベル0：全体データフロー（俯瞰図）**

```
ユーザー
  │
  ▼
Next.js UI
  │
  ▼
FastAPI（API層）
  │
  ├── Epicure（食材ベクトル）
  ├── Jev API（味覚判定）
  ├── Qwen Local（レシピ生成）
  ▼
PostgreSQL（保存・検索）
```

---

# **レベル1：主要機能ごとのデータフロー**

---

# **A. 既存レシピ検索 → レーダーチャート表示 → 編集 → 保存**

```
[ユーザー]
   │ ①検索条件入力（ジャンル・キーワード）
   ▼
[Next.js /recipes/search]
   │ ②検索API呼び出し
   ▼
[FastAPI /api/recipes/search]
   │ ③DBからレシピ＋味スコア取得
   ▼
[PostgreSQL recipes + taste_scores]
   │
   ▼
[Next.js]
   │ ④レシピ一覧＋レーダーチャート表示
   ▼
[ユーザー]
   │ ⑤レシピ選択
   ▼
[Next.js /recipes/edit/[id]]
   │ ⑥編集（追加・削除・分量変更）
   ▼
[FastAPI /api/recipes/edit]
   │ ⑦Epicureで特徴量抽出
   │ ⑧Jevで味スコア再評価
   ▼
[PostgreSQL 保存]
   │
   ▼
[Next.js]
   │ ⑨レーダーチャート更新表示
```

---

# **B. Qwen補助レシピ生成 → 編集 → Jev評価 → 保存**

```
[ユーザー]
   │ ①材料＋条件入力
   ▼
[Next.js /recipes/assist]
   │ ②Qwen生成API呼び出し
   ▼
[FastAPI /api/recipes/assist]
   │ ③Qwen Localでレシピ生成
   ▼
[Next.js]
   │ ④生成レシピ表示
   ▼
[ユーザー]
   │ ⑤編集（追加・削除・分量変更）
   ▼
[FastAPI /api/recipes/edit]
   │ ⑥Epicure特徴量抽出
   │ ⑦Jev味スコア評価
   ▼
[PostgreSQL 保存]
   │
   ▼
[Next.js]
   │ ⑧レーダーチャート比較（初期 vs 改善）
```

---

# **C. バルク生成（最大10レシピ）→ 一括評価 → ランキング → レーダー比較**

```
[ユーザー]
   │ ①材料セット＋条件入力＋生成数（count）入力
   ▼
[Next.js /recipes/bulk]
   │ ②Qwenバルク生成API呼び出し
   ▼
[FastAPI /api/recipes/generate_bulk]
   │ ③Qwen Localで指定数（最大10）のレシピ生成
   ▼
[PostgreSQL bulk_recipes 保存]
   │
   ▼
[Next.js]
   │ ④一括評価ボタン押下
   ▼
[FastAPI /api/recipes/evaluate_bulk]
   │ ⑤Epicure特徴量抽出（バッチ内のレシピ数分）
   │ ⑥Jev一括判定（バッチ内のレシピ数分）
   ▼
[PostgreSQL taste_scores 保存]
   │
   ▼
[Next.js /recipes/bulk/[batch_id]/ranking]
   │ ⑦ランキング表示（総合・甘味・旨味など）
   ▼
[Next.js /recipes/compare]
   │ ⑧レーダーチャート比較（複数レシピ）
```

---

# **D. レーダーチャート生成のデータフロー**

```
[Next.js]
   │ ①比較したいレシピIDを送信
   ▼
[FastAPI /api/charts/radar]
   │ ②DBから味スコア取得
   │ ③チャート用データ整形
   ▼
[Next.js]
   │ ④レーダーチャート描画
```

---

# **E. データフローの役割（追加要件対応）**

### ✔ 保存したレシピは検索画面でレーダーチャート付きで表示  
→ PostgreSQL → FastAPI → Next.js の流れで実現

### ✔ 初期レシピの味覚を保持し、Qwen生成レシピと比較  
→ `/recipes/edit/[id]` → `/recipes/assist` → `/recipes/compare`

### ✔ 編集（追加・削除・分量変更）による味の変化を即時反映  
→ Epicure → Jev → レーダーチャート

### ✔ 100レシピ自動生成の味覚分布を比較  
→ バッチID → 一括評価 → ランキング → レーダー比較

---

# **F. 全体統合版 DFD（最終図）**

```
ユーザー
  │
  ▼
Next.js UI
  │
  ├── レシピ検索 → レーダーチャート表示
  ├── レシピ編集 → Jev評価 → 保存
  ├── Qwen補助生成 → 編集 → 比較
  ├── バルク生成（最大10レシピ）→ 一括評価 → ランキング → 比較
  ▼
FastAPI
  │
  ├── epicure_loader（食材ベクトル）
  ├── taste_feature_extractor（味特徴量）
  ├── jev_client（味覚判定）
  ├── qwen_client（レシピ生成）
  ├── chart_service（レーダー整形）
  ▼
PostgreSQL
  │
  ├── recipes
  ├── recipe_ingredients
  ├── taste_scores
  ├── bulk_batches
  ├── bulk_recipes
  └── recipe_edits
```

---

# ⭐ **これで「味覚AIプラットフォーム」の全体像が完全に固まりました。**

- UX（画面遷移）  
- API仕様  
- ディレクトリ構成  
- データモデル  
- データフロー  

すべてが一貫した設計になっています。

---
