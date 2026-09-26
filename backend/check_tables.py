"""recipes テーブルの状態を確認するスクリプト"""
import sys
import os

DATABASE_URL = "postgresql+psycopg://admin:genjipi@localhost:5432/cooking_recipes"

output_lines = []

try:
    from sqlalchemy import create_engine, text

    eng = create_engine(DATABASE_URL)
    conn = eng.connect()

    # テーブル一覧
    result = conn.execute(text(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    ))
    tables = result.fetchall()

    output_lines.append("Tables: " + str([t[0] for t in tables]))

    # recipes テーブルの列確認
    if "recipes" in [t[0] for t in tables]:
        result = conn.execute(text(
            "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='recipes' ORDER BY ordinal_position"
        ))
        cols = result.fetchall()
        output_lines.append("\nrecipes columns:")
        for col in cols:
            output_lines.append(f"  {col[0]}: {col[1]} (nullable={col[2]})")

    conn.close()
except Exception as e:
    import traceback
    output_lines.append("ERROR: " + str(e))
    output_lines.append("TRACEBACK: " + traceback.format_exc())

# ファイルに出力（UTF-8）
output_path = os.path.join(os.path.dirname(__file__), "check_tables_output.txt")
with open(output_path, "w", encoding="utf-8") as f:
    f.write("\n".join(output_lines))
