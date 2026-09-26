"""taste_scores テーブル新規作成 + recipes テーブル新規作成 + 拡張

- recipes: 新規作成（title_ja, title_en, instructions_ja, instructions_en, genre等）
- taste_scores: Jev 評価結果を保存 (K, L API 仕様)

Revision ID: 0001
Revises:
Create Date: 2026-09-26
"""

from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """recipes テーブル新規作成 + taste_scores テーブル作成 (FK依存順序)"""

    # --- recipes テーブル新規作成 ---
    op.create_table(
        "recipes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("parent_recipe_id", sa.Integer(), sa.ForeignKey("recipes.id"), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("title_ja", sa.Text(), nullable=False),
        sa.Column("title_en", sa.Text(), nullable=False),
        sa.Column("instructions_ja", sa.Text(), nullable=True),
        sa.Column("instructions_en", sa.Text(), nullable=True),
        sa.Column("genre", sa.Text(), nullable=True),
        sa.Column("source", sa.Text(), nullable=True),
        sa.Column("original_link", sa.Text(), nullable=True),
        sa.Column("is_favorite", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("comment_updated_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # --- taste_scores テーブル新規作成 ---
    op.create_table(
        "taste_scores",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("recipe_id", sa.Integer(), sa.ForeignKey("recipes.id"), nullable=False),
        sa.Column("sweet", sa.SmallInteger(), nullable=True),
        sa.Column("salty", sa.SmallInteger(), nullable=True),
        sa.Column("bitter", sa.SmallInteger(), nullable=True),
        sa.Column("spicy", sa.SmallInteger(), nullable=True),
        sa.Column("umami", sa.SmallInteger(), nullable=True),
        sa.Column("overall", sa.SmallInteger(), nullable=True),
        sa.Column("confidence", sa.Integer(), nullable=True),
        sa.Column("aroma_intensity", sa.SmallInteger(), nullable=True),
        sa.Column("aroma_family", sa.Text(), nullable=True),
        sa.Column("texture_intensity", sa.SmallInteger(), nullable=True),
        sa.Column("texture_profile", sa.Text(), nullable=True),
        sa.Column("raw_json", sa.JSON(), nullable=True),
        sa.Column(
            "evaluated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # taste_scores インデックス
    op.create_index("idx_taste_scores_sweet", "taste_scores", ["sweet"])
    op.create_index("idx_taste_scores_salty", "taste_scores", ["salty"])
    op.create_index("idx_taste_scores_bitter", "taste_scores", ["bitter"])
    op.create_index("idx_taste_scores_spicy", "taste_scores", ["spicy"])
    op.create_index("idx_taste_scores_umami", "taste_scores", ["umami"])
    op.create_index("idx_taste_scores_overall", "taste_scores", ["overall"])
    op.create_index("idx_taste_scores_aroma_intensity", "taste_scores", ["aroma_intensity"])
    op.create_index("idx_taste_scores_aroma_family", "taste_scores", ["aroma_family"])
    op.create_index("idx_taste_scores_texture_intensity", "taste_scores", ["texture_intensity"])
    op.create_index("idx_taste_scores_texture_profile", "taste_scores", ["texture_profile"])
    op.create_index("idx_taste_scores_overall_conf", "taste_scores", ["overall", "confidence"])


def downgrade() -> None:
    """元に戻す"""

    # taste_scores テーブル削除
    op.drop_index("idx_taste_scores_overall_conf", table_name="taste_scores")
    op.drop_index("idx_taste_scores_texture_profile", table_name="taste_scores")
    op.drop_index("idx_taste_scores_texture_intensity", table_name="taste_scores")
    op.drop_index("idx_taste_scores_aroma_family", table_name="taste_scores")
    op.drop_index("idx_taste_scores_aroma_intensity", table_name="taste_scores")
    op.drop_index("idx_taste_scores_overall", table_name="taste_scores")
    op.drop_index("idx_taste_scores_umami", table_name="taste_scores")
    op.drop_index("idx_taste_scores_spicy", table_name="taste_scores")
    op.drop_index("idx_taste_scores_bitter", table_name="taste_scores")
    op.drop_index("idx_taste_scores_salty", table_name="taste_scores")
    op.drop_index("idx_taste_scores_sweet", table_name="taste_scores")
    op.drop_table("taste_scores")

    # recipes テーブル削除
    op.drop_table("recipes")
