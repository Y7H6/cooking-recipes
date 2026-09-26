# GAP-01, GAP-04, GAP-10 方針決定記録

**作成日:** 2026-09-26  
**目的:** 主要3つのGAPの方針決定と設計書への反映  
**関連:** [`design-review-and-gap-analysis.md`](design-review-and-gap-analysis.md)

---

## GAP-01: チャート間のデータ連携設計

### 方針決定

**基本構造:**
```
レシピ（親）
├── 味チャート
│   ├── 甘さ軸（5段階）
│   ├── 塩味軸（5段階）
│   ├── 苦味軸（5段階）
│   ├── 辛味軸（5段階）
│   ├── うま味軸（5段階）
│   └── 総合軸（5段階）
├── 香りチャート
│   ├── 香り強度軸（0〜100）
│   └── 香り系統軸（8系統から選択）
├── 食感チャート
│   ├── 食感強度軸（0〜100）
│   └── 食感系統軸（8系統から選択）
├── 用途チャート
│   ├── とろみ付け軸（0〜100）
│   ├── 甘味軸（0〜100）
│   ├── 酸味軸（0〜100）
│   ├── 旨味補強軸（0〜100）
│   ├── 香味軸（0〜100）
│   └── 脂質軸（0〜100）
└── 栄養チャート
    ├── 高脂質軸（0〜100）
    ├── 高タンパク軸（0〜100）
    ├── 高炭水化物軸（0〜100）
    ├── 高食物繊維軸（0〜100）
    ├── 高ビタミン軸（0〜100）
    └── 低カロリー軸（0〜100）
```

**検索ロジック:**
- 各チャートの軸指定は **AND検索** となる
- 例: 「甘さが4以上」かつ「フローラル香が3以上」のレシピのみが表示される
- 各軸に **絞り込み解除ボタン** を用意
- 一覧画面に **絞り込み全解除ボタン** を用意

**UIモックアップ:**
```
┌─────────────────────────────────────────────────────────────┐
│ レシピ選択メニュー                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [検索]  [味で探す]  [ジャンル]                            │
│  ─────  ─────────  ───────                                 │
│                                                             │
│  ▸ 味で探すタブ                                             │
│  ┌─────────────────┐  ┌─────────────────────────────┐     │
│  │ チャートタブ    │  │ 絞り込み条件                 │     │
│  │                 │  │                             │     │
│  │ [味] [香り]     │  │ ▸ 甘さ: 4以上 [解除]       │     │
│  │ [食感] [用途]   │  │ ▸ フローラル香: 3以上 [解除]│     │
│  │ [栄養]          │  │                             │     │
│  │ ────────────    │  │ [絞り込み全解除]            │     │
│  │                 │  │                             │     │
│  │   甘さ ●        │  │ ────────────────────────    │     │
│  │  /    \         │  │ 検索結果                     │     │
│  │ 塩味    うま味   │  │                             │     │
│  │  \    /         │  │ 1. 和風カレー                │     │
│  │   辛味          │  │    甘さ: 5, フローラル香: 4 │     │
│  │                 │  │    [編集する] [保存する]     │     │
│  │ [この味で検索]  │  │                             │     │
│  └─────────────────┘  │ 2. ハーブ香カレー            │     │
│                       │    甘さ: 4, フローラル香: 5 │     │
│  ┌─────────────────┐  │    [編集する] [保存する]     │     │
│  │ 検索結果         │  │                             │     │
│  │                 │  │ ...                           │     │
│  │ 1. 和風カレー   │  │                             │     │
│  │    [詳細]       │  │                             │     │
│  │                 │  │                             │     │
│  │ 2. ハーブ香カレー│ │                             │     │
│  │    [詳細]       │  │                             │     │
│  └─────────────────┘  └─────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## GAP-04: taste_scoresの更新戦略

### 方針決定

**基本ルール:**
1. **レシピ編集時は新しいレシピとして保存**（上書きしない）
2. **既存レシピは不変**（ユーザーが作成したレシピのみ削除可能）
3. **論理削除**（`is_deleted` フラグで管理）
4. **再評価ボタン** で手動トリガー

**データフロー:**
```
ユーザーがレシピを編集
        │
        ▼
   保存ボタン押下
        │
        ├──▶ 新しいレシピIDを発行
        ├──▶ 新規レシピとしてDBに保存
        └──▶ taste_scoresも新規に計算・保存
        │
        ▼
   再評価ボタン押下（任意）
        │
        ▼
   Jevで再評価
        │
        ▼
   新しいtaste_scoresを新規レコードとして保存
```

**検索オプション:**
```json
{
  "recipe_type": "all",  // "existing" | "user_created" | "all"
  "is_deleted": false    // 論理削除除外
}
```

| オプション | 説明 |
|-----------|------|
| `existing` | Data.csvからインポートした既存レシピのみ |
| `user_created` | ユーザーが作成・編集したレシピのみ |
| `all` | 両方（デフォルト） |

**DB設計（拡張）:**

recipesテーブルに追加列:
```sql
ALTER TABLE recipes ADD COLUMN user_id INTEGER;  -- ユーザーID（NULLの場合=既存レシピ）
ALTER TABLE recipes ADD COLUMN parent_recipe_id INTEGER;  -- 元レシピID（編集時）
ALTER TABLE recipes ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;  -- 論理削除フラグ
```

---

## GAP-10: レーダーチャートの実装ライブラリ

### 方針決定

**選択:** Recharts

**理由:**
1. PoC規模で十分対応可能
2. Next.js/App Routerに対応
3. TypeScript型安全
4. ドキュメントが充実
5. バンドルサイズが比較的小さい

**将来の移行:**
- PoCが成功した場合、Nivoへのアップデートを検討
- Nivoはより高度なカスタマイズが可能だが、学習コストとバンドルサイズが大きい

**Rechartsのレーダーチャート例:**
```tsx
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const data = [
  { axis: '甘さ', value: 80 },
  { axis: '塩味', value: 40 },
  { axis: '苦味', value: 10 },
  { axis: '辛味', value: 70 },
  { axis: 'うま味', value: 90 },
  { axis: '総合', value: 65 },
];

<RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
  <PolarGrid />
  <PolarAngleAxis dataKey="axis" />
  <PolarRadiusAxis angle={30} domain={[0, 100]} />
  <Radar name="レシピ" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
</RadarChart>
```

---

## 実装入りに必要な追加検討事項

### 決定が必要な事項

| 項目 | 内容 | 優先度 |
|------|------|--------|
| **ユーザー認証** | ユーザーIDの取得方法（簡易版か本格的か） | 高 |
| **レシピ名の自動生成** | 保存時にレシピ名を自動生成するか手動入力か | 中 |
| **バージョン管理** | 編集履歴の表示方法（最大何回分まで表示か） | 低 |

### 推奨対応

1. **ユーザー認証**: PoCは簡易版（ローカルストレージにuser_idを保存）
2. **レシピ名**: 自動生成（Qwenでタイトル生成）＋ 手動編集可能
3. **バージョン管理**: 最大10回分まで表示（UIで切り替え可能）

---

## 設計書への反映箇所

| 設計書 | 反映箇所 |
|--------|---------|
| [`recipe-selection-ui-design.md`](recipe-selection-ui-design.md) | §2.5 API設計（AND検索対応）、§2.7 フロントエンド設計 |
| [`csv-import-and-taste-profile-design.md`](../architecture/csv-import-and-taste-profile-design.md) | §4 DB設計（user_id, parent_recipe_id, is_deleted追加） |
| [`api-spec-details.md`](../api/api-spec-details.md) | §1 GET /api/recipes/search（recipe_typeパラメータ追加） |
| [`taste-evaluation-design.md`](../architecture/taste-evaluation-design.md) | §4 DB設計（user_id, parent_recipe_id追加） |

---

## 関連ドキュメント

- [`design-review-and-gap-analysis.md`](design-review-and-gap-analysis.md) - ギャップ分析レポート
- [`recipe-selection-ui-design.md`](recipe-selection-ui-design.md) - レシピ選択UI設計
- [`csv-import-and-taste-profile-design.md`](../architecture/csv-import-and-taste-profile-design.md) - Epicure解析設計
- [`taste-evaluation-design.md`](../architecture/taste-evaluation-design.md) - Jev評価設計
