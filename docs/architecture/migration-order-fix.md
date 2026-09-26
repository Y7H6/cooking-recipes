# DBマイグレーション順序修正 - 対策詳細

## 1. 問題概要

### 1.1 現象
```
sqlalchemy.exc.ProgrammingError: (psycopg.errors.UndefinedTable) リレーション"recipes"は存在しません
[SQL: ALTER TABLE recipes ADD COLUMN user_id INTEGER]
```

### 1.2 発生条件
- データベースに `recipes` テーブルが存在しない状態
- マイグレーションファイルで `taste_scores` を先に作成しようとした
- `taste_scores.recipe_id` が `recipes.id` にFK参照しているためエラー

### 1.3 根本原因
| # | 原因 | 説明 |
|---|------|------|
| 1 | **recipesテーブル未作成** | データベースにrecipesテーブルが存在しなかった |
| 2 | **FK依存順序の誤り** | taste_scoresを先に作成したが、recipe_idがrecipes.idにFK参照していた |

## 2. 環境情報

| 項目 | 値 |
|------|-----|
| OS | Windows 11 |
| PostgreSQL | 18.4 |
| pgvector | 0.8.3 |
| SQLAlchemy | 2.x |
| Alembic | latest |
| Python | 3.12+ |

## 3. 修正内容

### 3.1 ファイル
- [`backend/alembic/versions/0001_taste_scores_and_recipes_extension.py`](../backend/alembic/versions/0001_taste_scores_and_recipes_extension.py)

### 3.2 変更前（誤り）
```python
def upgrade() -> None:
    # taste_scores を先に作成（recipes FK参照）← エラー
    op.create_table("taste_scores", ..., sa.ForeignKey("recipes.id"), ...)
    
    # recipes テーブル拡張（存在しないテーブルに追加）← エラー
    op.add_column("recipes", sa.Column("user_id", ...))
```

### 3.3 変更後（修正）
```python
def upgrade() -> None:
    # 1. recipes テーブル新規作成
    op.create_table("recipes", ...)
    
    # 2. taste_scores テーブル作成（recipes FK参照可能）
    op.create_table("taste_scores", ..., sa.ForeignKey("recipes.id"), ...)
```

## 4. DBテーブル構造

### 4.1 recipes テーブル

| 列 | 型 | 制約 | 説明 |
|----|------|------|------|
| id | INTEGER | PK, AUTO_INCREMENT | メインキー |
| user_id | INTEGER | NULL | ユーザーID |
| parent_recipe_id | INTEGER | FK → recipes.id | 親レシピID |
| is_deleted | BOOLEAN | NOT NULL, DEFAULT FALSE | 論理削除フラグ |
| title_ja | TEXT | NOT NULL | 日本語タイトル |
| title_en | TEXT | NOT NULL | 英語タイトル |
| instructions_ja | TEXT | NULL | 日本語作り方 |
| instructions_en | TEXT | NULL | 英語作り方 |
| genre | TEXT | NULL | 料理文化 |
| source | TEXT | NULL | データソース |
| original_link | TEXT | NULL | オリジナルURL |
| is_favorite | BOOLEAN | NOT NULL, DEFAULT FALSE | お気に入りフラグ |
| comment | TEXT | NULL | コメント |
| comment_updated_at | TIMESTAMPTZ | NULL | コメント更新日時 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 更新日時 |

### 4.2 taste_scores テーブル

| 列 | 型 | 制約 | 説明 |
|----|------|------|------|
| id | INTEGER | PK, AUTO_INCREMENT | メインキー |
| recipe_id | INTEGER | FK → recipes.id, NOT NULL | レシピID |
| sweet | SMALLINT | NULL | 甘さ（0-100） |
| salty | SMALLINT | NULL | 塩味（0-100） |
| bitter | SMALLINT | NULL | 苦味（0-100） |
| spicy | SMALLINT | NULL | 辛味（0-100） |
| umami | SMALLINT | NULL | うま味（0-100） |
| overall | SMALLINT | NULL | 総合（0-100） |
| confidence | INTEGER | NULL | 信頼度 |
| aroma_intensity | SMALLINT | NULL | 香りの強度 |
| aroma_family | TEXT | NULL | 香り系統 |
| texture_intensity | SMALLINT | NULL | 食感の強度 |
| texture_profile | TEXT | NULL | 食感系統 |
| raw_json | JSON | NULL | Jev生レスポンス |
| evaluated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 評価日時 |

### 4.3 インデックス（taste_scores）

| インデックス名 | 列 | 種類 |
|---------------|------|------|
| idx_taste_scores_sweet | sweet | B-tree |
| idx_taste_scores_salty | salty | B-tree |
| idx_taste_scores_bitter | bitter | B-tree |
| idx_taste_scores_spicy | spicy | B-tree |
| idx_taste_scores_umami | umami | B-tree |
| idx_taste_scores_overall | overall | B-tree |
| idx_taste_scores_aroma_intensity | aroma_intensity | B-tree |
| idx_taste_scores_aroma_family | aroma_family | B-tree |
| idx_taste_scores_texture_intensity | texture_intensity | B-tree |
| idx_taste_scores_texture_profile | texture_profile | B-tree |
| idx_taste_scores_overall_conf | (overall, confidence) | 複合インデックス |

## 5. 再発防止策

### 5.1 マイグレーション順序のルール
1. **FK参照元を先に作成**: 外部キー参照されるテーブルを先に作成する
2. **CREATE TABLE → ALTER TABLE → CREATE INDEX の順**: テーブル作成 → 列追加 → インデックス作成
3. **依存関係の可視化**: ドキュメントでテーブル間の依存関係を明記

### 5.2 チェックリスト
- [ ] FK依存関係を確認した
- [ ] 参照元テーブルが先に作成される順序にした
- [ ] downgrade() で逆順に削除する
- [ ] テーブル名・列名のスペルを確認した

### 5.3 検証手順
```sql
-- 1. テーブル一覧確認
\dt

-- 2. テーブル構造確認
\d recipes
\d taste_scores

-- 3. FK制約確認
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE contype = 'f';

-- 4. インデックス確認
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'taste_scores';

-- 5. マイグレーション履歴確認
SELECT * FROM alembic_version;
```

## 6. 関連ファイル

| ファイル | 説明 |
|----------|------|
| [`backend/alembic/versions/0001_taste_scores_and_recipes_extension.py`](../backend/alembic/versions/0001_taste_scores_and_recipes_extension.py) | マイグレーションファイル |
| [`backend/app/models/recipe.py`](../backend/app/models/recipe.py) | SQLAlchemy ORMモデル |
| [`backend/app/models/taste_score.py`](../backend/app/models/taste_score.py) | SQLAlchemy ORMモデル |
| [`docs/architecture/csv-import-and-taste-profile-design.md`](../docs/architecture/csv-import-and-taste-profile-design.md) | DB設計書 |
| [`docs/ux/recipe-selection-ui-design.md`](../docs/ux/recipe-selection-ui-design.md) | UI設計書 |

## 7. 更新履歴

| 日付 | 変更内容 | 変更者 |
|------|---------|--------|
| 2026-09-26 | 初版作成（マイグレーション順序修正） | AI Agent |
