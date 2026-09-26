# 設計書レビューとギャップ分析レポート

**作成日:** 2026-09-26  
**目的:** レシピ選択UI設計までの設計書レビューと、未検討事項の特定  
**関連設計書:**
- [`ui-design.md`](ui-design.md) - 既存UI設計
- [`csv-import-and-taste-profile-design.md`](../architecture/csv-import-and-taste-profile-design.md) - Epicure解析設計
- [`taste-evaluation-design.md`](../architecture/taste-evaluation-design.md) - Jev評価設計
- [`api-spec-details.md`](../api/api-spec-details.md) - API仕様
- [`recipe-selection-ui-design.md`](recipe-selection-ui-design.md) - レシピ選択UI設計（拡張版）

---

## 1. 既存設計書のレビュー結果

### 1.1 既に完了している設計事項

| カテゴリ | 設計内容 | ステータス |
|----------|---------|-----------|
| システム構成 | バックエンド/フロントエンド/DBの責務分離 | [OK] |
| ディレクトリ構造 | backend/frontend/ml/infraへの分離 | [OK] |
| DB設計（基本） | recipes, recipe_ingredients, taste_scores | [OK] |
| DB設計（拡張） | taste_profiles, 香り・食感・用途・栄養軸 | [OK] |
| Epicure解析 | CSVインポート、マッピング、プロファイル計算 | [OK] |
| Jev評価 | 6軸味覚＋香り2軸＋食感2軸の判定設計 | [OK] |
| API仕様（基本） | 検索・取得・編集・評価・バルク生成 | [OK] |
| UI設計（基本） | 6画面のワイヤーフレーム | [OK] |
| レシピ選択UI | 5チャートタブ＋並べ替え＋絞り込み | [OK] |

### 1.2 設計書の整合性確認

| 項目 | 整合性 | 備考 |
|------|--------|------|
| DB設計 ↔ API仕様 | ✅ 整合 | taste_scoresの列がAPIレスポンスに反映 |
| UI設計 ↔ API仕様 | ✅ 整合 | レーダーチャートがAPIで取得可能 |
| Epicure解析 ↔ DB設計 | ✅ 整合 | taste_profilesに保存される |
| Jev評価 ↔ DB設計 | ✅ 整合 | taste_scoresに保存される |
| レシピ選択UI ↔ API仕様 | ⚠️ 一部未定義 | search-by-tasteとrankingは新規追加必要 |

---

## 2. 未検討事項（ギャップ分析）

### 2.1 システム統合に関する検討事項

#### GAP-01: チャート間のデータ連携設計
**深刻度:** 高  
**説明:** 5つのチャート（味・香り・食感・用途・栄養）が独立して動作するため、ユーザーが複数のチャートをまたいで条件を指定した際のデータ連携が未定義。

**具体例:**
- ユーザーが「味タブで甘さ60」「香りタブでハーブ香」を指定した場合、どのように検索条件を統合するか？
- 各チャートの重み付け（味:1.0, 香り:0.7等）の妥当性検証が必要

**提案:**
```python
# チャート間の重み付けポリシー
CHART_WEIGHTS = {
    'taste': 1.0,      # 主軸（Jev評価結果）
    'aroma': 0.7,      # 副軸（低信頼度傾向）
    'texture': 0.7,    # 副軸（低信頼度傾向）
    'function': 0.8,   # 決定論的（Epicureベース）
    'nutrition': 0.8,  # 決定論的（Epicureベース）
}
```

#### GAP-02: 検索結果のキャッシュ戦略
**深刻度:** 中  
**説明:** 頻繁に検索される味パターン（例: 「甘口」「辛口」）の結果をキャッシュするかどうか未定義。

**提案:**
- Redisまたはメモリキャッシュで検索結果を保持（TTL: 5分）
- キャッシュキー: `search:{taste_hash}:{aroma_hash}:{sort_by}:{sort_order}`

#### GAP-03: エラーハンドリング設計
**深刻度:** 中  
**説明:** Jev APIがダウンした場合、Epicureベクトルが未取得の場合のフォールバック未定義。

**提案:**
```python
# フォールバックポリシー
if jev_api_down:
    # taste_scoresがない場合はtaste_profiles（Epicureベース）で検索
    return search_by_taste_profile(target, min_confidence=0.0)
elif epicure_vector_missing:
    # Epicureベクトルがない場合は味軸のみで検索
    return search_by_taste_axes_only(target, min_confidence=min_confidence)
```

### 2.2 データベースに関する検討事項

#### GAP-04: taste_scoresの更新戦略
**深刻度:** 高  
**説明:** レシピ編集時にtaste_scoresを再評価するタイミングと方法が未定義。

**具体例:**
- ユーザーが材料を追加した場合、即時再評価するか？バッチ処理か？
- 再評価時のJev APIコスト（1リクエストあたり）

**提案:**
```python
# taste_scores更新ポリシー
def update_taste_scores(recipe_id: int, force: bool = False):
    """
    recipe_idのtaste_scoresを更新
    
    Args:
        recipe_id: 対象レシピID
        force: Trueの場合、既存スコアがあっても再評価
    """
    # 1. レシピの変更点を取得
    changes = get_recipe_changes(recipe_id)
    
    # 2. 変更があればJev再評価
    if changes or force:
        new_scores = jev_client.evaluate(recipe_id)
        save_taste_scores(recipe_id, new_scores)
        
        # 3. キャッシュ無効化
        invalidate_search_cache(recipe_id)
```

#### GAP-05: インデックスの最適化戦略
**深刻度:** 中  
**説明:** taste_scoresとtaste_profilesに多数のインデックスを追加するが、その効果とオーバーヘッドのバランスが未検証。

**提案:**
- PoC段階では必須インデックスのみ追加（GAP-01で定義）
- 本番運用時はEXPLAIN ANALYZEでクエリ計画を確認
- インデックス肥大化（> DBサイズの30%）の場合は部分インデックスを検討

#### GAP-06: taste_scoresの履歴管理
**深刻度:** 低  
**説明:** 1レシピに複数回の評価履歴を残す設計だが、最新評価のみを使用するか履歴も表示するか未定義。

**提案:**
- UIで「評価履歴」タブを追加（過去5回まで表示）
- レシピ編集時のスコア変化をグラフで表示

### 2.3 APIに関する検討事項

#### GAP-07: search-by-taste APIのページネーション
**深刻度:** 中  
**説明:** offsetベースのページネーションは大量データでパフォーマンス劣化する。

**提案:**
```python
# カーソルベースのページネーション（推奨）
{
    "results": [...],
    "next_cursor": "eyJvZmZzZXQiOiAxMH0=",  # base64エンコード
    "has_more": true
}

# クライアント側
{
    "taste": {...},
    "cursor": "eyJvZmZzZXQiOiAxMH0=",
    "limit": 10
}
```

#### GAP-08: ranking APIのソート軸制限
**深刻度:** 低  
**説明:** sort_byで任意の軸を指定できるが、存在しない軸を指定した場合のエラーハンドリング未定義。

**提案:**
- ソート軸のホワイトリストを定義し、それ以外を拒否
```python
ALLOWED_SORT_COLUMNS = {
    'overall', 'sweet', 'salty', 'bitter', 'spicy', 'umami',
    'aroma_intensity', 'texture_intensity',
    'high_protein', 'low_calorie'
}

if sort_by not in ALLOWED_SORT_COLUMNS:
    raise HTTPException(status_code=422, detail=f"Invalid sort column: {sort_by}")
```

#### GAP-09: 香り系統・食感系統のフィルタリングAPI
**深刻度:** 中  
**説明:** aroma_familyやtexture_profileでのフィルタリングはChoiceの結果（文字列）なので、インデックス効果が高いが未検証。

**提案:**
- B-treeインデックスを追加（GAP-05参照）
- 確率分布の上位系統のみをフィルタ対象にする（例: `aroma_family_probabilities->>'herbal' > 0.5`）

### 2.4 フロントエンドに関する検討事項

#### GAP-10: レーダーチャートの実装ライブラリ
**深刻度:** 高  
**説明:** レーダーチャートを実装するライブラリが未選定。

**提案:**
| ライブラリ | メリット | デメリット | 推奨度 |
|-----------|---------|-----------|--------|
| **Recharts** | Next.js対応、TypeScript型安全 | チャートタイプが少ない | ★★★ |
| **Nivo** | レーダーチャート対応、カスタマイズ性高 | バンドルサイズ大 | ★★☆ |
| **Chart.js** | 柔軟性高、ドキュメント充実 | Reactラッパー必要 | ★★☆ |
| **D3.js** | 最高自由度 | 学習コスト高 | ★☆☆ |

> **推奨:** Rechartsの`<RadarChart>`コンポーネントを使用。PoC規模で十分対応可能。

#### GAP-11: チャート間の状態管理
**深刻度:** 中  
**説明:** 5つのチャートをまたいで状態（ユーザーの指定値）を管理する方法が未定義。

**提案:**
```tsx
// Zustandストア（推奨）
import { create } from 'zustand';

interface TasteState {
  taste: TasteVector | null;
  aroma: AromaVector | null;
  texture: TextureVector | null;
  function: FunctionVector | null;
  nutrition: NutritionVector | null;
  setTaste: (taste: TasteVector) => void;
  setAroma: (aroma: AromaVector) => void;
  // ...
}

export const useTasteStore = create<TasteState>((set) => ({
  taste: null,
  aroma: null,
  texture: null,
  function: null,
  nutrition: null,
  setTaste: (taste) => set({ taste }),
  setAroma: (aroma) => set({ aroma }),
  // ...
}));
```

#### GAP-12: チャートプリセットの管理
**深刻度:** 低  
**説明:** 「甘口」「辛口」等のプリセット値が未定義。

**提案:**
```typescript
// frontend/lib/taste-presets.ts
export const TASTE_PRESETS = {
  sweet: { sweet: 80, salty: 30, bitter: 10, spicy: 10, umami: 40, overall: 60 },
  spicy: { sweet: 20, salty: 40, bitter: 10, spicy: 90, umami: 50, overall: 55 },
  umami: { sweet: 30, salty: 50, bitter: 10, spicy: 20, umami: 90, overall: 70 },
  light: { sweet: 20, salty: 20, bitter: 5, spicy: 5, umini: 30, overall: 40 },
} as const;

export const AROMA_PRESETS = {
  herbal: { intensity: 70, family: 'herbal' },
  spice: { intensity: 60, family: 'spice' },
  smoky: { intensity: 80, family: 'smoky' },
} as const;
```

#### GAP-13: レスポンシブデザイン
**深刻度:** 中  
**説明:** レーダーチャートがモバイルでどのように表示されるか未定義。

**提案:**
- モバイル: チャートと結果を上下に配置（タブ切り替え）
- デスクトップ: チャートと結果を左右に配置（並列表示）

### 2.5 セキュリティに関する検討事項

#### GAP-14: Jev APIキーの管理
**深刻度:** 高  
**説明:** Jev APIキーのローテーション・期限切れ対策が未定義。

**提案:**
```python
# backend/app/core/config.py
class Settings(BaseSettings):
    jev_api_key: str
    jev_api_key_expiry: datetime | None = None
    
    def validate_jev_api_key(self) -> bool:
        if self.jev_api_key_expiry and datetime.now() > self.jev_api_key_expiry:
            logger.warning("JEV_API_KEY expired")
            return False
        return True
```

#### GAP-15: APIレートリミット
**深刻度:** 中  
**説明:** ユーザーが無限に検索リクエストを送信できる場合の対策が未定義。

**提案:**
```python
# backend/app/middleware/rate_limit.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/api/recipes/search-by-taste")
@limiter.limit("30/minute")  # 1ユーザーあたり30リクエスト/分
def search_by_taste(request: Request, ...):
    ...
```

### 2.6 運用に関する検討事項

#### GAP-16: Epicure CSVの更新戦略
**深刻度:** 中  
**説明:** Epicure CSVが更新された際の再マッピング方法が未定義。

**提案:**
- バージョン管理（epicure_core.csv v1.0, v1.1等）
- 更新時は全レシピを再マッピング（バッチ処理）
- マッピング結果の差分のみを適用（チェックサム比較）

#### GAP-17: taste_scoresの妥当性検証
**深刻度:** 中  
**説明:** Jev評価結果が実際の味と一致しているかの検証方法が未定義。

**提案:**
- PoC段階で20〜30レシピのサンプルを人工ラベルと比較
- raw_json（probabilities）を保存し、後日検証に使用
- 信頼度が低い軸（confidence < 0.5）の多いレシピを重点検証

#### GAP-18: バッチインポートの再開機能
**深刻度:** 中  
**説明:** Data.csvの223万行インポート中に失敗した場合、最初からやり直す必要がある。

**提案:**
```python
# インポート状態の管理テーブル
CREATE TABLE import_states (
    id SERIAL PRIMARY KEY,
    csv_path TEXT NOT NULL,
    last_row_id INTEGER,  # 最後にインポートしたrow_id
    status TEXT,  -- 'running', 'completed', 'failed'
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

# 再開時はlast_row_idから継続
def resume_import(csv_path: str, last_row_id: int):
    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if i <= last_row_id:
                continue  # 既にインポート済みの行をスキップ
            ...
```

---

## 3. 優先度マトリックス

| GAP ID | 項目 | 深刻度 | 優先度 | 対応フェーズ |
|--------|------|--------|--------|-------------|
| GAP-01 | チャート間のデータ連携設計 | 高 | **P0** | 実装前 |
| GAP-04 | taste_scoresの更新戦略 | 高 | **P0** | 実装前 |
| GAP-10 | レーダーチャートの実装ライブラリ | 高 | **P0** | 実装前 |
| GAP-14 | Jev APIキーの管理 | 高 | **P1** | 本番前 |
| GAP-03 | エラーハンドリング設計 | 中 | **P1** | 実装前 |
| GAP-07 | search-by-tasteのページネーション | 中 | **P1** | 実装時 |
| GAP-09 | 香り・食感フィルタリングAPI | 中 | **P1** | 実装時 |
| GAP-11 | チャート間の状態管理 | 中 | **P1** | 実装前 |
| GAP-13 | レスポンシブデザイン | 中 | **P2** | 本番前 |
| GAP-05 | インデックスの最適化戦略 | 中 | **P2** | 本番前 |
| GAP-15 | APIレートリミット | 中 | **P2** | 本番前 |
| GAP-16 | Epicure CSVの更新戦略 | 中 | **P2** | 運用時 |
| GAP-17 | taste_scoresの妥当性検証 | 中 | **P2** | PoC後 |
| GAP-02 | 検索結果のキャッシュ戦略 | 低 | **P3** | スケーリング時 |
| GAP-06 | taste_scoresの履歴管理 | 低 | **P3** | 将来拡張 |
| GAP-08 | ranking APIのソート軸制限 | 低 | **P2** | 実装時 |
| GAP-12 | チャートプリセットの管理 | 低 | **P2** | 実装時 |

---

## 4. 推奨対応順序

### フェーズ1: 実装前（必須）
1. **GAP-01**: チャート間の重み付けポリシーを確定
2. **GAP-04**: taste_scoresの更新戦略を確定
3. **GAP-10**: レーダーチャートの実装ライブラリを選定

### フェーズ2: 実装時（必須）
4. **GAP-03**: エラーハンドリング設計を実装
5. **GAP-07**: カーソルベースのページネーションを実装
6. **GAP-09**: 香り・食感フィルタリングAPIを実装
7. **GAP-11**: Zustandストアで状態管理を実装
8. **GAP-08**: ソート軸のホワイトリストを実装
9. **GAP-12**: チャートプリセットを定義

### フェーズ3: 本番前（推奨）
10. **GAP-14**: Jev APIキーの管理を実装
11. **GAP-13**: レスポンシブデザインを実装
12. **GAP-15**: APIレートリミットを実装

### フェーズ4: 本番後（将来）
13. **GAP-05**: インデックスの最適化を実施
14. **GAP-17**: taste_scoresの妥当性検証を実施
15. **GAP-02**: キャッシュ戦略を導入
16. **GAP-06**: taste_scoresの履歴管理を実装
17. **GAP-16**: Epicure CSVの更新戦略を策定

---

## 5. まとめ

### 既に完了している設計
- システム構成、ディレクトリ構造、DB設計（基本・拡張）
- Epicure解析、Jev評価、API仕様（基本）、UI設計（基本）
- レシピ選択UI（5チャートタブ＋並べ替え＋絞り込み）

### 未検討事項の総数
- **18項目**（P0: 3, P1: 6, P2: 5, P3: 4）

### 最も重要な3項目
1. **GAP-01**: チャート間の重み付けポリシー（実装前必須）
2. **GAP-04**: taste_scoresの更新戦略（実装前必須）
3. **GAP-10**: レーダーチャートの実装ライブラリ選定（実装前必須）

---

## 6. 関連ドキュメント

- [`ui-design.md`](ui-design.md) - 既存UI設計
- [`csv-import-and-taste-profile-design.md`](../architecture/csv-import-and-taste-profile-design.md) - Epicure解析設計
- [`taste-evaluation-design.md`](../architecture/taste-evaluation-design.md) - Jev評価設計
- [`api-spec-details.md`](../api/api-spec-details.md) - API仕様
- [`recipe-selection-ui-design.md`](recipe-selection-ui-design.md) - レシピ選択UI設計（拡張版）
