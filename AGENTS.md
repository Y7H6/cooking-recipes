# プロジェクト指示書（AGENTS.md）

本プロジェクトは **料理レシピ管理アプリ「Epicure × Jev × Qwen3.8 27B 味覚AI PoC」** です。

AIコーディングエージェント（Roo Code / Claude Code 等）が本プロジェクトで作業する際の
プロジェクトレベルの指示書として機能します。

---

## 1. プロジェクト概要

**目的:**
Epicure（味覚空間モデル）× Jev（型付き評価器）× Qwen3.8 27B Local（ローカル LLM）を組み合わせ、
「レシピ生成」と「味の定量評価・最適化」を行う AI エンジンの PoC（概念実証）を構築する。

**技術スタック:**

| 区分 | 技術 |
|------|------|
| フロントエンド | Next.js（App Router、TypeScript） |
| バックエンド | Python / FastAPI |
| データベース | PostgreSQL（pgvector 拡張対応） |
| 味覚モデル | Epicure（1,790 食材 × 300 次元ベクトル、CC BY 4.0） |
| 評価器 | Jev API（TypeSafe AI、型付き＋確率付き出力） |
| レシピ生成 | Qwen3.8 27B Local（ローカル LLM） |

---

## 2. ディレクトリ構造と各ディレクトリの責務

```
cooking-recipes/
├── AGENTS.md           # 本ファイル（AIエージェント用プロジェクト指示書）
├── README.md           # プロジェクト概要・セットアップ手順
├── .env.example        # 環境変数のサンプル
├── docker-compose.yml  # Dockerインフラ定義（PostgreSQL）
├── .gitignore
├── .agents/            # AIエージェント用スキル等
├── backend/            # FastAPI バックエンド
│   ├── pyproject.toml  # 依存管理（uv 想定）
│   ├── app/
│   │   ├── main.py     # FastAPI アプリケーション入口
│   │   ├── core/       # 設定(config.py)、DB接続(db.py) [OK]
│   │   ├── models/     # SQLAlchemy ORMモデル [WIP]
│   │   ├── schemas/    # Pydanticスキーマ（入力検証・出力形式） [WIP]
│   │   ├── services/   # ビジネスロジック（epicure_loader, jev_client, qwen_client 等） [WIP]
│   │   └── routers/    # FastAPI ルーター（エンドポイント定義） [WIP]
│   ├── alembic/        # データベースマイグレーション
│   ├── tests/          # テストコード
│   └── data/           # 静的データ（Epicure CSV 等）
├── frontend/           # Next.js フロントエンド
│   ├── app/            # App Router ページ・レイアウト [WIP]
│   ├── components/     # UIコンポーネント [WIP]
│   └── lib/            # ユーティリティ関数 [WIP]
└── docs/               # 設計書・仕様書
    ├── proposal/       # 企画書・提案書
    ├── architecture/   # 技術アーキテクチャ・データフロー
    ├── api/            # API仕様書
    └── ux/             # UX設計・画面設計
```

**ステータス表記:**
- `[OK]`: 実装済み
- `[WIP]`: 開発中（未実装）

---

## 3. バックエンド規約（FastAPI）

### 3.1 プロジェクト構成

- **Python バージョン:** >= 3.12
- **依存管理:** `uv` を使用（`uv sync` / `uv run`）
- **パッケージ構成:** 責務分離を徹底（routers / schemas / services / core / models）

### 3.2 レイヤ構成

| レイヤ | 場所 | 責務 |
|--------|------|------|
| routers | `app/routers/` | HTTP エンドポイント定義、リクエスト/レスポンスの受け取り |
| schemas | `app/schemas/` | Pydantic モデル（入力検証・出力形式の定義） |
| services | `app/services/` | ビジネスロジック（Epicure 処理、Jev/Qwen クライアント等） |
| core | `app/core/` | 設定(config.py)、DB接続(db.py) 等の基盤機能 |
| models | `app/models/` | SQLAlchemy ORM モデル |

### 3.3 コーディング規約

- **型ヒント:** 関数・変数に型ヒントを付与（Pydantic v2 準拠）
- **ドキュメント文字列:** 各モジュール・クラス・関数に docstring を付与
- **エラーハンドリング:** サービス層で適切に例外をキャッチ・変換
- **ハードコード禁止:** 設定値は `app/core/config.py`（pydantic-settings）経由で取得
- **命名規則:**
  - ファイル名: `snake_case`
  - クラス名: `PascalCase`
  - 関数・変数名: `snake_case`
  - 定数: `UPPER_SNAKE_CASE`

### 3.4 データベースマイグレーション

- **ツール:** Alembic
- **コマンド:**
  ```bash
  cd backend
  alembic revision --autogenerate -m "migration description"
  alembic upgrade head
  ```
- テーブル変更時は必ずマイグレーションファイルを作成すること。

---

## 4. フロントエンド規約（Next.js）

- **フレームワーク:** Next.js（App Router）
- **言語:** TypeScript
- **ディレクトリ構成:**
  - `app/`: ページ・レイアウト・ルートレベルのロジック [WIP]
  - `components/`: 再利用可能な UI コンポーネント [WIP]
  - `lib/`: ユーティリティ関数・共通ロジック [WIP]
- **API クライアント:** バックエンド（FastAPI）との通信は `fetch` または `axios` を使用
- **環境変数:** `.env.local` で管理（`.gitignore` で除外）

---

## 5. 開発環境の起動方法

### 5.1 PostgreSQL の起動（Docker）

```bash
docker-compose up -d postgres
```

### 5.2 バックエンドのセットアップ

```bash
cd backend
uv sync
```

> **注意:** `requirements.txt` は使用しません。依存管理は `pyproject.toml` + `uv` で統一してください。

### 5.3 Epicure CSV の取得

Hugging Face から `epicure_core.csv` をダウンロードし、`backend/data/` に配置します。

```bash
# https://huggingface.co/Kaikaku/epicure-core から取得
```

### 5.4 フロントエンドの依存インストール

```bash
cd frontend
npm install
```

### 5.5 環境変数の設定

```bash
cp .env.example .env
# .env を編集して各値を設定
```

**主要環境変数:**

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `DATABASE_URL` | PostgreSQL の接続文字列 | `postgresql+psycopg://postgres:postgres@localhost:5432/cooking_recipes` |
| `JEV_API_KEY` | Jev API の認証キー | （空） |
| `QWEN_ENDPOINT` | Qwen3.8 27B Local のエンドポイント URL | `http://localhost:11434` |
| `EPICURE_CSV_PATH` | Epicure CSV ファイルのパス | `backend/data/epicure_core.csv` |

### 5.6 サーバーの起動

```bash
# バックエンド（別ターミナル）
cd backend
uvicorn app.main:app --reload

# フロントエンド（別ターミナル）
cd frontend
npm run dev
```

---

## 6. テストのやり方

### 6.1 バックエンドテスト

```bash
cd backend
uv run pytest tests/
```

- テストファイルは `backend/tests/` に配置
- 依存管理: `pyproject.toml` の `[project.optional-dependencies] dev` 参照
- 既存テスト: [`test_health.py`](backend/tests/test_health.py)（ヘルスチェックの簡易テスト）

---

## 7. コーディング規約・命名規則・禁止事項

### 7.1 命名規則

| 要素 | 規則 | 例 |
|------|------|-----|
| ファイル名 | `snake_case` | `jev_client.py` |
| クラス名 | `PascalCase` | `TasteScoreSchema` |
| 関数名 | `snake_case` | `get_taste_score()` |
| 変数名 | `snake_case` | `recipe_list` |
| 定数 | `UPPER_SNAKE_CASE` | `MAX_BATCH_COUNT` |

### 7.2 禁止事項

- **ハードコードの禁止:** 設定値（DB接続文字列、APIキー等）をコードに直接記述しない
- **機密情報のコミット禁止:** `.env` ファイルは `.gitignore` で除外されている。APIキー等をコミットしないこと
- **単一ファイルへの機能集中の回避:** 責務分離を意識し、適切なディレクトリ/ファイルに分割すること
- **既存コードの無視:** 既存の設計書・仕様書と矛盾する実装を行わないこと

---

## 8. セキュリティ上の注意

### 8.1 機密情報の扱い

- `JEV_API_KEY`、`DATABASE_URL` 等の機密情報は `.env` ファイルで管理
- `.env` ファイルは絶対にリポジトリにコミットしない（`.gitignore` で除外済み）
- 本番環境では環境変数またはシークレット管理ツールを使用すること

### 8.2 .env.example の更新

環境変数の追加・変更時は必ず `.env.example` も同時に更新すること。

---

## 9. ドキュメント更新のルール

### 9.1 設計変更時の対応

- **技術アーキテクチャ変更:** [`docs/architecture/technical-architecture.md`](docs/architecture/technical-architecture.md) を更新
- **データフロー変更:** [`docs/architecture/data-flow-graph.md`](docs/architecture/data-flow-graph.md) を更新
- **API仕様変更:** [`docs/api/api-spec-details.md`](docs/api/api-spec-details.md) を更新
- **UX設計変更:** [`docs/ux/ui-design.md`](docs/ux/ui-design.md) を更新
- **企画書変更:** [`docs/proposal/proposal.md`](docs/proposal/proposal.md) を更新

### 9.2 ドキュメントの整合性

- コード変更と設計書の整合性を常に保つこと
- 新しい機能を実装する際は、まず設計書に反映させてから実装すること
- README.md のドキュメント一覧も必要に応じて更新すること

---

## 10. Epicure クレジット表記（必須）

本プロジェクトでは Epicure データを CC BY 4.0 ライセンスの下で利用しています。

```
Epicure ingredient embeddings © 2026 Jakub Radzikowski & Josef Chen (KAIKAKU.AI)
Licensed under CC BY 4.0. https://creativecommons.org/licenses/by/4.0/
```

---

## 11. 主要APIエンドポイント（概要）

| メソッド | エンドポイント | 説明 | ステータス |
|----------|---------------|------|-----------|
| GET | `/api/health` | ヘルスチェック | [OK] |
| GET | `/api/recipes/search` | ジャンル・キーワードで既存レシピ検索 | [WIP] |
| GET | `/api/recipes/{id}` | レシピ詳細取得 | [WIP] |
| POST | `/api/recipes/edit` | 材料追加・削除・分量変更 → 再評価 | [WIP] |
| POST | `/api/recipes/evaluate` | 任意レシピを Jev で評価 | [WIP] |
| POST | `/api/recipes/assist` | Qwen 補助レシピ生成 | [WIP] |
| POST | `/api/recipes/generate_bulk` | ユーザー指定数（最大10）のレシピ自動生成 | [WIP] |
| POST | `/api/recipes/evaluate_bulk` | バッチに属するレシピを Jev で一括判定 | [WIP] |
| GET | `/api/recipes/bulk/{batch_id}/ranking` | ランキング取得 | [WIP] |
| GET | `/api/charts/radar` | レーダーチャート用データ取得 | [WIP] |

詳細は [`docs/api/api-spec-details.md`](docs/api/api-spec-details.md) を参照。

---

## 12. ユースケース一覧

| ID | 機能 | 説明 |
|----|------|------|
| UC-01 | 既存レシピ検索 | ジャンル・キーワードでの検索、レーダーチャート付き一覧 |
| UC-02 | レシピ詳細取得 | 材料・作り方・味スコアの表示 |
| UC-03 | レシピ評価 | 材料＋作り方 → 味スコア＋信頼度の算出 |
| UC-04 | レシピ編集 | 材料追加・削除・分量変更 → 自動再評価 |
| UC-05 | Qwen 補助レシピ生成 | 材料・制約条件からレシピ案を生成 |
| UC-06 | バルク生成 | ユーザー指定数（最大10）のレシピ自動生成 |
| UC-07 | 一括評価 | 生成レシピの一括味スコア評価 |
| UC-08 | ランキング | 評価結果によるランキング表示 |
| UC-09 | 味比較 | 複数レシピの味をレーダーチャートで比較 |
| UC-10 | 改善ループ最適化 | 生成レシピの評価 → 改善提案 → 再評価 |
| UC-11 | 食材マスタ取り込み | Epicure CSV からの食材データインポート |
| UC-12 | 編集履歴記録 | レシピ編集の差分履歴を保存 |

---

## 13. ロードマップ

| フェーズ | 期間 | 内容 |
|----------|------|------|
| フェーズ1 | 2〜3週間 | 基盤構築（Epicure CSV 解析、FastAPI＋PostgreSQL 雛形、Next.js セットアップ） |
| フェーズ2 | 3〜4週間 | 味スコア API 実装（食材→ベクトル→味特徴量、Jev クライアント、評価 UI） |
| フェーズ3 | 3〜4週間 | レシピ生成＋最適化（Qwen クライアント、生成→評価→改善ループ） |
| フェーズ4 | 2週間 | 検証・デモ（デモシナリオ作成、味スコア妥当性確認、説明資料整備） |

---

## 14. ドキュメント一覧

| カテゴリ | ファイル |
|----------|----------|
| docs 目次 | [docs/README.md](docs/README.md) |
| 企画書 | [proposal/proposal.md](docs/proposal/proposal.md) |
| 経営企画書 | [business-proposal.md](docs/proposal/business-proposal.md) |
| 技術アーキテクチャ | [technical-architecture.md](docs/architecture/technical-architecture.md) |
| データフロー図 | [data-flow-graph.md](docs/architecture/data-flow-graph.md) |
| API 仕様 | [api-spec-details.md](docs/api/api-spec-details.md) |
| UX 設計 | [ui-design.md](docs/ux/ui-design.md) |
| ページ遷移図 | [page-transition-chart.md](docs/ux/page-transition-chart.md) |
| Epicure ライセンス | [epicure-license.md](docs/proposal/epicure-license.md) |

---

## 15. 更新が必要な箇所（TODO）

- [ ] `.env.example` に記載のない新しい環境変数が追加された場合、本ファイルの「5.5 環境変数の設定」と「8.2 .env.example の更新」を参照して更新
- [ ] 新しいディレクトリ構造が追加された場合、「2. ディレクトリ構造」を更新
- [ ] API エンドポイントが追加/変更された場合、「11. 主要APIエンドポイント」と「docs/api/api-spec-details.md」を更新
- [ ] UC-01〜UC-12 の実装状況に合わせて、該当ユースケースのステータスを確認

---

**本ファイルの最終更新日:** 2026-09-23
