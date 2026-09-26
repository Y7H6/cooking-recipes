# Epicure × Jev × Qwen3.8 27B 味覚AI PoC

## 概要

**味覚を数値で扱い、「レシピ生成」と「味の評価・最適化」を行う AI エンジンの PoC（概念実証）**です。

LLM の「評価が毎回変わる・根拠が曖昧」という弱点を、以下の組み合わせで補完します。

- **Epicure**：1,790 食材 × 300 次元ベクトルによる味覚空間モデル
- **Jev（TypeSafe AI）**：型付き＋確率付きの評価器
- **Qwen3.8 27B Local**：ローカル LLM によるレシピ生成

技術スタックは **Next.js + FastAPI + PostgreSQL** を統一し、将来の拡張を見据えた構成です。

---

## 技術スタック

| 区分 | 技術 |
|------|------|
| フロントエンド | Next.js（App Router、TypeScript） |
| バックエンド | Python / FastAPI |
| データベース | PostgreSQL |
| 味覚モデル | Epicure（1,790 食材 × 300 次元ベクトル、CC BY 4.0） |
| 評価器 | Jev API（TypeSafe AI、型付き＋確率付き出力） |
| レシピ生成 | Qwen3.8 27B Local（ローカル LLM） |

---

## 主要機能・ユースケース

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

## ディレクトリ構造

```
cooking-recipes/
├── README.md
├── .env.example
├── docker-compose.yml
├── backend/
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py
│   │   ├── core/        # config.py, db.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/    # epicure_loader, taste_feature_extractor, jev_client, qwen_client, recipe_service, bulk_service, chart_service
│   │   └── routers/     # recipes, bulk, charts, search
│   ├── alembic/
│   ├── tests/
│   └── data/
├── frontend/
│   ├── app/
│   ├── components/
│   └── lib/
└── docs/
    ├── proposal/
    ├── architecture/
    ├── api/
    └── ux/
```

---

## 開発方式

**使用駆動開発（ユースケース駆動）** を採用しています。

- UC-01, UC-02 から順に実装を進めます
- 各ユースケースを実装可能な状態でリリースし、フィードバックを反映
- 新規参加者は `docs/` 配下の設計書からプロジェクトを理解できます

---

## 開発環境セットアップ手順

### 1. PostgreSQL の起動（Docker 使用）

```bash
docker-compose up -d postgres
```

### 2. バックエンドのセットアップ（uv 使用）

> **注意**: `requirements.txt` は使用しません。依存管理は `pyproject.toml` + `uv` で統一されています。

#### uv のインストール（未インストールの場合）

```bash
# pip を使用する場合
pip install uv

# または公式インストーラー（推奨）
# https://docs.astral.sh/uv/getting-started/installation/
```

#### 依存のインストール

```bash
cd backend
uv sync
```

> **補足**: `uv sync` は `pyproject.toml` に記載された依存関係を自動的にインストールします。

### 3. Epicure CSV の取得

Hugging Face から `epicure_core.csv` をダウンロードし、`backend/data/` に配置します。

```bash
# Hugging Face リポジトリから取得
# https://huggingface.co/Kaikaku/epicure-core
```

### 4. フロントエンドの依存インストール

```bash
cd frontend
npm install
```

### 5. 環境変数の設定

```bash
cp .env.example .env
# .env を編集して各値を設定
```

### 6. サーバーの起動

```bash
# バックエンド（別ターミナル）
cd backend
uv run uvicorn app.main:app --reload

# フロントエンド（別ターミナル）
cd frontend
npm run dev
```

### 7. テスト実行（オプション）

```bash
cd backend
uv run pytest tests/
```

---

## 環境変数

`.env.example` に記載の主要環境変数：

| 変数名 | 説明 |
|--------|------|
| `JEV_API_KEY` | Jev API の認証キー |
| `DATABASE_URL` | PostgreSQL の接続文字列 |
| `QWEN_ENDPOINT` | Qwen3.8 27B Local のエンドポイント URL |
| `EPICURE_CSV_PATH` | Epicure CSV ファイルのパス |

---

## ドキュメント

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

## Epicure クレジット表記（必須）

本プロジェクトでは Epicure データを CC BY 4.0 ライセンスの下で利用しています。

```
Epicure ingredient embeddings © 2026 Jakub Radzikowski & Josef Chen (KAIKAKU.AI)
Licensed under CC BY 4.0. https://creativecommons.org/licenses/by/4.0/
```

詳細は [`epicure-license.md`](docs/proposal/epicure-license.md) を参照してください。

---

## ロードマップ

| フェーズ | 期間 | 内容 |
|----------|------|------|
| フェーズ1 | 2〜3週間 | 基盤構築（Epicure CSV 解析、FastAPI＋PostgreSQL 雛形、Next.js セットアップ） |
| フェーズ2 | 3〜4週間 | 味スコア API 実装（食材→ベクトル→味特徴量、Jev クライアント、評価 UI） |
| フェーズ3 | 3〜4週間 | レシピ生成＋最適化（Qwen クライアント、生成→評価→改善ループ） |
| フェーズ4 | 2週間 | 検証・デモ（デモシナリオ作成、味スコア妥当性確認、説明資料整備） |

---

## ライセンス

本プロジェクトのコードは別途ライセンスを定める場合、Epicure データは **CC BY 4.0** で利用してください。
