# レシピ選択メニューのUI/UX設計書（拡張版）

**作成日:** 2026-09-26  
**対象:** Data.csv（約223万行）からのレシピ選択メニュー設計  
**関連:** [`ui-design.md`](ui-design.md) / [`csv-import-and-taste-profile-design.md`](../architecture/csv-import-and-taste-profile-design.md) / [`taste-evaluation-design.md`](../architecture/taste-evaluation-design.md)

---

## 1. レシピ選択メニューのアイデア出し

### 1.1 選択方法の比較検討

| 選択方法 | メリット | デメリット | 実装難易度 |
|----------|----------|------------|-----------|
| **ジャンル別絞り込み** | 直感的、フィルタリングが簡単 | ジャンル分類が不正確な場合も | 低 |
| **フリーワード検索** | 柔軟な検索可能 | スペルミス・日本語/英語の不一致 | 中 |
| **一覧表示＋選択** | 全貌を把握できる | スクロールが必要、大量データでは非効率 | 低 |
| **レーダーチャート検索** ⭐ | 味の好みから逆引き可能 | 実装複雑、Epicure解析基盤必要 | **高** |

### 1.2 推奨アプローチ：ハイブリッド選択メニュー

ユーザーの目的に応じて複数の選択方法を組み合わせる：

```
┌─────────────────────────────────────────────────────────────┐
│                    レシピ選択メニュー                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [検索タブ]    [味で探すタブ]    [ジャンルで探すタブ]       │
│  ──────────    ─────────────    ──────────────────          │
│                                                             │
│  ▸ 検索タブ:                                                │
│    ┌───────────────────────────────────────────┐           │
│    │ 🔍 キーワード検索                          │           │
│    │ [カレー] [検索]                            │           │
│    └───────────────────────────────────────────┘           │
│    結果: 和風カレー ★4.2 | 鶏肉のカレー ...                │
│                                                             │
│  ▸ 味で探すタブ（拡張）:                                    │
│    ┌───────────────────────────────────────────┐           │
│    │ 📊 チャートで検索                           │           │
│    │   [味] [香り] [食感] [用途] [栄養]         │           │
│    │   ────  ─────  ─────  ─────  ─────        │           │
│    │                                          │           │
│    │   ▸ 味タブ（デフォルト）:                  │           │
│    │      甘さ: [====|====] 塩味: [====|====]  │           │
│    │      辛さ: [===|=====] うま味: [====|====] │           │
│    │      苦味: [==|======] 総合: [====|====]  │           │
│    │      [この味で検索]                        │           │
│    │                                          │           │
│    │   ▸ 香りタブ（オプション）:                │           │
│    │      香りの強度: [===|=====]              │           │
│    │      香りの系統: [ハーブ ▼]               │           │
│    │      [この香りで検索]                      │           │
│    │                                          │           │
│    │   ▸ 食感タブ（オプション）:                │           │
│    │      食感の強度: [====|====]              │           │
│    │      食感の系統: [サクサク ▼]             │           │
│    │      [この食感で検索]                      │           │
│    │                                          │           │
│    │   ▸ 用途タブ（オプション）:                │           │
│    │      とろみ付け: [====|====]              │           │
│    │      旨味補強: [===|=====]               │           │
│    │      ...                                 │           │
│    │      [この用途で検索]                      │           │
│    │                                          │           │
│    │   ▸ 栄養タブ（オプション）:                │           │
│    │      高脂質: [====|====]                  │           │
│    │      高タンパク: [===|=====]             │           │
│    │      ...                                 │           │
│    │      [この栄養で検索]                      │           │
│    └───────────────────────────────────────────┘           │
│                                                             │
│  ▸ ジャンルで探すタブ:                                      │
│    ┌───────────────────────────────────────────┐           │
│    │ 🍱 ジャンル選択                            │           │
│    │ [和食 ▼] [中華 ▼] [洋食 ▼] [スイーツ ▼]  │           │
│    │ [検索]                                     │           │
│    └───────────────────────────────────────────┘           │
│    結果: 和風カレー ★4.2 | 寿司 ...                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. レーダーチャート検索機能の設計（拡張版）

### 2.1 機能概要

ユーザーが複数の解析チャート（味・香り・食感・用途・栄養）で好みの条件を指定し、
それに類似したレシピをデータベースから検索する機能。

**核心:** あらかじめ既存のレシピに対してEpicureのデータを使って解析し、
データベースに蓄積した解析結果（taste_scoresテーブル、taste_profilesテーブル）を呼び出して検索する。

### 2.2 システム構成図

```
┌─────────────────────────────────────────────────────────────────────┐
│                     レーダーチャート検索パイプライン                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ユーザー（Next.js）                                                │
│     │                                                               │
│     ▼                                                               │
│  ┌──────────────────┐    条件指定    ┌──────────────────┐          │
│  │ マルチチャート   │                │ FastAPI バックエンド│          │
│  │ コンポーネント   │                │                  │          │
│  └──────────────────┘                │  ┌──────────────┐│          │
│                                      │  │ taste_scores ││          │
│                                      │  │ テーブル検索   ││          │
│                                      │  └──────┬───────┘│          │
│                                      │         │        │          │
│                                      │  ┌──────▼───────┐│          │
│                                      │  │ Epicure     ││          │
│                                      │  │ ベクトル    ││          │
│                                      │  │ 類似度計算   ││          │
│                                      │  └──────┬───────┘│          │
│                                      └─────────┼────────┘          │
│                                                │                    │
│                                       ┌────────▼────────┐          │
│                                       │  類似レシピ結果  │          │
│                                       │  （マルチチャート）│          │
│                                       └──────────────────┘          │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                     データ蓄積フロー（バッチ処理）                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Data.csv (2.3GB) ──▶ Epicureマッピング ──▶ taste_profiles テーブル │
│                         ──▶ Jev評価 ────▶ taste_scores テーブル     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 対応解析チャートの一覧

[`taste-evaluation-design.md`](../architecture/taste-evaluation-design.md) に基づく対応軸：

| チャート | 軸数 | 軸名 | データソース | DB保存先 |
|----------|------|------|-------------|---------|
| **味覚** | 6 | sweet, salty, bitter, spicy, umami, overall | Jev Score × 25 | taste_scores |
| **香り** | 2 | aroma_intensity（強度）, aroma_family（系統） | Jev Score＋Choice | taste_scores |
| **食感** | 2 | texture_intensity（強度）, texture_profile（系統） | Jev Score＋Choice | taste_scores |
| **用途** | 6 | thickener, sweetener, souring_agent, umami_booster, aromatic_base, fat_source | Epicure cosine | taste_profiles.taste_json |
| **栄養** | 6 | high_fat, high_protein, high_carb, fiber_rich, vitamin_rich, low_calorie | Epicure chem cosine | taste_profiles.nutrition_profile_json |

### 2.4 データベース設計（既存設計からの拡張）

#### 2.4.1 taste_scores テーブル（検索用インデックス追加）

既存設計（[`taste-evaluation-design.md`](../architecture/taste-evaluation-design.md) §4.3）を参照。
**追加すべきインデックス:**

```sql
-- 味軸ごとのインデックス（ランキング・フィルタ用）
CREATE INDEX idx_taste_scores_sweet ON taste_scores (sweet);
CREATE INDEX idx_taste_scores_salty ON taste_scores (salty);
CREATE INDEX idx_taste_scores_bitter ON taste_scores (bitter);
CREATE INDEX idx_taste_scores_spicy ON taste_scores (spicy);
CREATE INDEX idx_taste_scores_umami ON taste_scores (umami);
CREATE INDEX idx_taste_scores_overall ON taste_scores (overall);

-- 香り軸のインデックス
CREATE INDEX idx_taste_scores_aroma_intensity ON taste_scores (aroma_intensity);
CREATE INDEX idx_taste_scores_aroma_family ON taste_scores (aroma_family);

-- 食感軸のインデックス
CREATE INDEX idx_taste_scores_texture_intensity ON taste_scores (texture_intensity);
CREATE INDEX idx_taste_scores_texture_profile ON taste_scores (texture_profile);

-- 複合インデックス（複数軸フィルタ用）
CREATE INDEX idx_taste_scores_overall_conf ON taste_scores (overall, confidence);
```

#### 2.4.2 taste_profiles テーブル（Epicureベースの味空間表現）

既存設計（[`csv-import-and-taste-profile-design.md`](../architecture/csv-import-and-taste-profile-design.md) §7.3）を参照。
**追加すべきインデックス:**

```sql
-- taste_jsonにGINインデックス（JSONB検索用）
CREATE INDEX idx_taste_profiles_taste_gin ON taste_profiles USING GIN (taste_json);

-- 用途プロファイルにGINインデックス
CREATE INDEX idx_taste_profiles_function_gin ON taste_profiles USING GIN (function_profile_json);

-- 栄養プロファイルにGINインデックス
CREATE INDEX idx_taste_profiles_nutrition_gin ON taste_profiles USING GIN (nutrition_profile_json);
```

### 2.5 API設計（拡張エンドポイント）

#### 2.5.1 レーダーチャート検索API（拡張版）

**POST /api/recipes/search-by-taste**

複数の解析チャートを横断して類似レシピを検索。

##### Request

```json
{
  "taste": {
    "sweet": 60,
    "salty": 40,
    "bitter": 10,
    "spicy": 70,
    "umami": 80,
    "overall": 75
  },
  "aroma": {
    "intensity": 65,
    "family": "herbal"
  },
  "texture": {
    "intensity": 50,
    "profile": "tender"
  },
  "function": {
    "thickener": 30,
    "umami_booster": 70
  },
  "nutrition": {
    "high_protein": 60,
    "low_calorie": 55
  },
  "sort_by": "overall",
  "sort_order": "desc",
  "min_confidence": 0.5,
  "limit": 10,
  "offset": 0
}
```

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `taste` | object | いいえ | 味覚6軸（各軸0〜100） |
| `aroma` | object | いいえ | 香り2軸（intensity: 0〜100, family: herbal/spice/citrus/nutty/smoky/fermented/floral/none） |
| `texture` | object | いいえ | 食感2軸（intensity: 0〜100, profile: crispy/chewy/tender/creamy/juicy/crunchy/fluffy/none） |
| `function` | object | いいえ | 用途プロファイル（各軸0〜100） |
| `nutrition` | object | いいえ | 栄養プロファイル（各軸0〜100） |
| `sort_by` | string | いいえ | 並べ替え軸（overall/sweet/salty/bitter/spicy/umami/aroma_intensity/texture_intensity/high_protein等） |
| `sort_order` | string | いいえ | asc/desc（デフォルト: desc） |
| `min_confidence` | float | いいえ | 最小信頼度（デフォルト: 0.0） |
| `limit` | int | いいえ | 取得件数（デフォルト: 10, 最大: 100） |
| `offset` | int | いいえ | オフセット（デフォルト: 0） |

> **設計判断:** 全チャートを任意パラメータにする。ユーザーが「味」と「香り」だけ指定しても検索可能。
> `sort_by` で任意の軸を昇順/降順に並べ替え可能。

##### Response

```json
{
  "results": [
    {
      "recipe_id": 101,
      "title": "和風カレー",
      "taste_score": {
        "sweet": 62,
        "salty": 38,
        "bitter": 8,
        "spicy": 72,
        "umami": 78,
        "overall": 74,
        "confidence": 0.86
      },
      "aroma": {
        "intensity": 60,
        "family": "spice",
        "family_probabilities": {"spice": 0.55, "herbal": 0.30, "smoky": 0.15}
      },
      "texture": {
        "intensity": 45,
        "profile": "tender",
        "profile_probabilities": {"tender": 0.60, "chewy": 0.30, "creamy": 0.10}
      },
      "function_profile": {
        "thickener": 25,
        "sweetener": 40,
        "souring_agent": 10,
        "umami_booster": 72,
        "aromatic_base": 55,
        "fat_source": 35
      },
      "nutrition_profile": {
        "high_fat": 45,
        "high_protein": 55,
        "high_carb": 60,
        "fiber_rich": 20,
        "vitamin_rich": 15,
        "low_calorie": 40
      },
      "similarity_score": 0.95
    },
    {
      "recipe_id": 205,
      "title": "辛口鶏肉カレー",
      "taste_score": {
        "sweet": 45,
        "salty": 50,
        "bitter": 15,
        "spicy": 80,
        "umami": 75,
        "overall": 70,
        "confidence": 0.82
      },
      "aroma": {
        "intensity": 70,
        "family": "smoky",
        "family_probabilities": {"smoky": 0.65, "spice": 0.25, "herbal": 0.10}
      },
      "texture": {
        "intensity": 55,
        "profile": "juicy",
        "profile_probabilities": {"juicy": 0.70, "tender": 0.20, "creamy": 0.10}
      },
      "function_profile": {
        "thickener": 30,
        "sweetener": 35,
        "souring_agent": 15,
        "umami_booster": 75,
        "aromatic_base": 60,
        "fat_source": 40
      },
      "nutrition_profile": {
        "high_fat": 50,
        "high_protein": 60,
        "high_carb": 55,
        "fiber_rich": 18,
        "vitamin_rich": 20,
        "low_calorie": 38
      },
      "similarity_score": 0.88
    }
  ],
  "total": 42,
  "search_params": {
    "taste": {"sweet": 60, "salty": 40, "bitter": 10, "spicy": 70, "umami": 80, "overall": 75},
    "aroma": {"intensity": 65, "family": "herbal"},
    "texture": {"intensity": 50, "profile": "tender"},
    "function": {"thickener": 30, "umami_booster": 70},
    "nutrition": {"high_protein": 60, "low_calorie": 55}
  }
}
```

#### 2.5.2 並べ替え・絞り込みAPI（新規）

**POST /api/recipes/ranking**

任意の軸で昇順/降順に並べ替えてレシピを取得。

##### Request

```json
{
  "sort_by": "umami",
  "sort_order": "desc",
  "filters": {
    "genre": "japanese",
    "aroma_family": "spice",
    "min_confidence": 0.5,
    "favorite_only": false
  },
  "limit": 10,
  "offset": 0
}
```

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `sort_by` | string | はい | 並べ替え軸（overall/sweet/salty/bitter/spicy/umami/aroma_intensity/aroma_family/texture_intensity/texture_profile/high_protein等） |
| `sort_order` | string | いいえ | asc/desc（デフォルト: desc） |
| `filters` | object | いいえ | フィルタ条件 |
| `filters.genre` | string | いいえ | ジャンルフィルタ |
| `filters.aroma_family` | string | いいえ | 香り系統フィルタ |
| `filters.texture_profile` | string | いいえ | 食感系統フィルタ |
| `filters.min_confidence` | float | いいえ | 最小信頼度 |
| `filters.favorite_only` | bool | いいえ | おのみ表示 |
| `limit` | int | いいえ | 取得件数（デフォルト: 10, 最大: 100） |
| `offset` | int | いいえ | オフセット（デフォルト: 0） |

##### Response

```json
{
  "ranking": [
    {"recipe_id": 101, "title": "和風カレー", "umami": 78},
    {"recipe_id": 205, "title": "辛口鶏肉カレー", "umami": 75},
    {"recipe_id": 310, "title": "味噌ラーメン", "umami": 72}
  ],
  "total": 42,
  "sort_by": "umami",
  "sort_order": "desc"
}
```

### 2.6 類似度計算アルゴリズム

#### 2.6.1 複数チャート対応の類似度計算

```python
# backend/app/services/taste_search_service.py

import numpy as np
from dataclasses import dataclass
from typing import Optional

@dataclass
class TasteVector:
    sweet: float
    salty: float
    bitter: float
    spicy: float
    umami: float
    overall: float

@dataclass
class AromaVector:
    intensity: float
    family: Optional[str] = None  # herbal/spice/citrus/nutty/smoky/fermented/floral/none

@dataclass
class TextureVector:
    intensity: float
    profile: Optional[str] = None  # crispy/chewy/tender/creamy/juicy/crunchy/fluffy/none

@dataclass
class FunctionVector:
    thickener: float
    sweetener: float
    souring_agent: float
    umami_booster: float
    aromatic_base: float
    fat_source: float

@dataclass
class NutritionVector:
    high_fat: float
    high_protein: float
    high_carb: float
    fiber_rich: float
    vitamin_rich: float
    low_calorie: float

def cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    """2つのベクトルのコサイン類似度を計算"""
    dot_product = np.dot(v1, v2)
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    return float(dot_product / (norm1 * norm2))

def calculate_cross_chart_similarity(
    target_taste: Optional[TasteVector] = None,
    target_aroma: Optional[AromaVector] = None,
    target_texture: Optional[TextureVector] = None,
    target_function: Optional[FunctionVector] = None,
    target_nutrition: Optional[NutritionVector] = None,
) -> float:
    """複数チャートを横断した類似度を計算"""
    vectors = []
    weights = []
    
    if target_taste:
        vec = np.array([target_taste.sweet, target_taste.salty, 
                        target_taste.bitter, target_taste.spicy, 
                        target_taste.umami, target_taste.overall])
        vectors.append(vec)
        weights.append(1.0)  # 味覚の重み
    
    if target_aroma:
        vec = np.array([target_aroma.intensity])
        vectors.append(vec)
        weights.append(0.7)  # 香りの重み（低信頼度傾向のため軽め）
    
    if target_texture:
        vec = np.array([target_texture.intensity])
        vectors.append(vec)
        weights.append(0.7)  # 食感の重み（低信頼度傾向のため軽め）
    
    if target_function:
        vec = np.array([target_function.thickener, target_function.sweetener,
                        target_function.souring_agent, target_function.umami_booster,
                        target_function.aromatic_base, target_function.fat_source])
        vectors.append(vec)
        weights.append(0.8)  # 用途の重み（決定論的なので高め）
    
    if target_nutrition:
        vec = np.array([target_nutrition.high_fat, target_nutrition.high_protein,
                        target_nutrition.high_carb, target_nutrition.fiber_rich,
                        target_nutrition.vitamin_rich, target_nutrition.low_calorie])
        vectors.append(vec)
        weights.append(0.8)  # 栄養の重み（決定論的なので高め）
    
    if not vectors:
        return 0.0
    
    # 重み付きコサイン類似度
    total_weight = sum(weights)
    weighted_similarities = []
    
    for vec, w in zip(vectors, weights):
        # DBから取得したレシピのベクトルとの類似度を計算
        sim = cosine_similarity(vec, vec)  # 実際にはDBから取得したベクトルを使用
        weighted_similarities.append(sim * w)
    
    return sum(weighted_similarities) / total_weight

def find_similar_recipes(
    target_taste: Optional[TasteVector] = None,
    target_aroma: Optional[AromaVector] = None,
    target_texture: Optional[TextureVector] = None,
    target_function: Optional[FunctionVector] = None,
    target_nutrition: Optional[NutritionVector] = None,
    sort_by: str = "overall",
    sort_order: str = "desc",
    min_confidence: float = 0.0,
    limit: int = 10,
    offset: int = 0,
) -> list[dict]:
    """類似したレシピを検索（複数チャート対応）"""
    # taste_scoresテーブルから条件に合うレコードを取得
    # 指定されたチャートの類似度を計算してソート
    # limit/offsetを適用して返却
    pass
```

### 2.7 フロントエンド設計（Next.js）

#### 2.7.1 マルチチャート検索コンポーネント

```tsx
// frontend/components/MultiChartSearch.tsx

interface ChartTab {
  id: 'taste' | 'aroma' | 'texture' | 'function' | 'nutrition';
  label: string;
  icon: string;
}

const CHART_TABS: ChartTab[] = [
  { id: 'taste', label: '味', icon: '👅' },
  { id: 'aroma', label: '香り', icon: '🌿' },
  { id: 'texture', label: '食感', icon: '🍴' },
  { id: 'function', label: '用途', icon: '🔬' },
  { id: 'nutrition', label: '栄養', icon: '🥗' },
];

interface MultiChartSearchProps {
  onSearch: (params: SearchParams) => void;
}

export function MultiChartSearch({ onSearch }: MultiChartSearchProps) {
  const [activeTab, setActiveTab] = useState<ChartTab['id']>('taste');
  
  return (
    <div className="multi-chart-search">
      {/* チャートタブ */}
      <div className="chart-tabs">
        {CHART_TABS.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
      
      {/* 各チャートの内容 */}
      <div className="chart-content">
        {activeTab === 'taste' && <TasteChart onSearch={onSearch} />}
        {activeTab === 'aroma' && <AromaChart onSearch={onSearch} />}
        {activeTab === 'texture' && <TextureChart onSearch={onSearch} />}
        {activeTab === 'function' && <FunctionChart onSearch={onSearch} />}
        {activeTab === 'nutrition' && <NutritionChart onSearch={onSearch} />}
      </div>
    </div>
  );
}
```

#### 2.7.2 各チャートコンポーネント

##### 味覚チャート（TasteChart）

```tsx
// frontend/components/TasteChart.tsx

interface TasteChartProps {
  onSearch: (taste: TasteVector) => void;
}

export function TasteChart({ onSearch }: TasteChartProps) {
  return (
    <div className="taste-chart">
      <RadarChart
        axes={[
          { name: '甘さ', key: 'sweet', min: 0, max: 100 },
          { name: '塩味', key: 'salty', min: 0, max: 100 },
          { name: '苦味', key: 'bitter', min: 0, max: 100 },
          { name: '辛味', key: 'spicy', min: 0, max: 100 },
          { name: 'うま味', key: 'umami', min: 0, max: 100 },
          { name: '総合', key: 'overall', min: 0, max: 100 },
        ]}
        onPointDrag={(values) => setTaste(values)}
      />
      <div className="preset-buttons">
        <button onClick={() => setPreset('sweet')}>甘口</button>
        <button onClick={() => setPreset('spicy')}>辛口</button>
        <button onClick={() => setPreset('umami')}>旨味重視</button>
        <button onClick={() => setPreset('light')}>あっさり</button>
      </div>
      <button onClick={() => onSearch(taste)}>この味で検索</button>
    </div>
  );
}
```

##### 香りチャート（AromaChart）

```tsx
// frontend/components/AromaChart.tsx

interface AromaChartProps {
  onSearch: (aroma: AromaVector) => void;
}

export function AromaChart({ onSearch }: AromaChartProps) {
  return (
    <div className="aroma-chart">
      {/* 香り強度チャート */}
      <RadarChart
        axes={[
          { name: '香りの強度', key: 'intensity', min: 0, max: 100 },
        ]}
        onPointDrag={(values) => setIntensity(values.intensity)}
      />
      
      {/* 香り系統セレクタ */}
      <div className="aroma-families">
        <label>香りの系統:</label>
        <select value={family} onChange={(e) => setFamily(e.target.value)}>
          <option value="">指定しない</option>
          <option value="herbal">🌿 ハーブ香</option>
          <option value="spice">🌶️ スパイス香</option>
          <option value="citrus">🍋 柑橘香</option>
          <option value="nutty">🥜 ナッツ香</option>
          <option value="smoky">🔥 スモーク香</option>
          <option value="fermented">🫙 発酵香</option>
          <option value="floral">🌸 花香</option>
          <option value="none">なし</option>
        </select>
      </div>
      
      <button onClick={() => onSearch({ intensity, family })}>この香りで検索</button>
    </div>
  );
}
```

##### 食感チャート（TextureChart）

```tsx
// frontend/components/TextureChart.tsx

interface TextureChartProps {
  onSearch: (texture: TextureVector) => void;
}

export function TextureChart({ onSearch }: TextureChartProps) {
  return (
    <div className="texture-chart">
      {/* 食感強度チャート */}
      <RadarChart
        axes={[
          { name: '食感の強度', key: 'intensity', min: 0, max: 100 },
        ]}
        onPointDrag={(values) => setIntensity(values.intensity)}
      />
      
      {/* 食感系統セレクタ */}
      <div className="texture-profiles">
        <label>食感の系統:</label>
        <select value={profile} onChange={(e) => setProfile(e.target.value)}>
          <option value="">指定しない</option>
          <option value="crispy">🍘 サクサク</option>
          <option value="chewy">🍜 もちもち</option>
          <option value="tender">🍖 ほろほろ</option>
          <option value="creamy">🍮 クリーミー</option>
          <option value="juicy">🥩 肉汁</option>
          <option value="crunchy">🥬 シャキシャキ</option>
          <option value="fluffy">🧁 ふわふわ</option>
          <option value="none">なし</option>
        </select>
      </div>
      
      <button onClick={() => onSearch({ intensity, profile })}>この食感で検索</button>
    </div>
  );
}
```

##### 用途チャート（FunctionChart）

```tsx
// frontend/components/FunctionChart.tsx

interface FunctionChartProps {
  onSearch: (func: FunctionVector) => void;
}

export function FunctionChart({ onSearch }: FunctionChartProps) {
  return (
    <div className="function-chart">
      <RadarChart
        axes={[
          { name: 'とろみ付け', key: 'thickener', min: 0, max: 100 },
          { name: '甘味', key: 'sweetener', min: 0, max: 100 },
          { name: '酸味', key: 'souring_agent', min: 0, max: 100 },
          { name: '旨味補強', key: 'umami_booster', min: 0, max: 100 },
          { name: '香味', key: 'aromatic_base', min: 0, max: 100 },
          { name: '脂質', key: 'fat_source', min: 0, max: 100 },
        ]}
        onPointDrag={(values) => setFunction(values)}
      />
      <button onClick={() => onSearch(function)}>この用途で検索</button>
    </div>
  );
}
```

##### 栄養チャート（NutritionChart）

```tsx
// frontend/components/NutritionChart.tsx

interface NutritionChartProps {
  onSearch: (nutrition: NutritionVector) => void;
}

export function NutritionChart({ onSearch }: NutritionChartProps) {
  return (
    <div className="nutrition-chart">
      <RadarChart
        axes={[
          { name: '高脂質', key: 'high_fat', min: 0, max: 100 },
          { name: '高タンパク', key: 'high_protein', min: 0, max: 100 },
          { name: '高炭水化物', key: 'high_carb', min: 0, max: 100 },
          { name: '高食物繊維', key: 'fiber_rich', min: 0, max: 100 },
          { name: '高ビタミン', key: 'vitamin_rich', min: 0, max: 100 },
          { name: '低カロリー', key: 'low_calorie', min: 0, max: 100 },
        ]}
        onPointDrag={(values) => setNutrition(values)}
      />
      <p className="disclaimer">※ これは完全な栄養データではなく、意味的傾向です</p>
      <button onClick={() => onSearch(nutrition)}>この栄養で検索</button>
    </div>
  );
}
```

#### 2.7.3 並べ替え・絞り込みUI

```tsx
// frontend/components/RecipeRanking.tsx

interface RecipeRankingProps {
  results: RecipeResult[];
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

export function RecipeRanking({ results, onSortChange }: RecipeRankingProps) {
  const [sortBy, setSortBy] = useState<string>('overall');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // 並べ替え軸セレクタ
  const SORT_OPTIONS = [
    { value: 'overall', label: '総合' },
    { value: 'sweet', label: '甘さ' },
    { value: 'salty', label: '塩味' },
    { value: 'bitter', label: '苦味' },
    { value: 'spicy', label: '辛味' },
    { value: 'umami', label: 'うま味' },
    { value: 'aroma_intensity', label: '香り強度' },
    { value: 'texture_intensity', label: '食感強度' },
    { value: 'high_protein', label: '高タンパク' },
    { value: 'low_calorie', label: '低カロリー' },
  ];
  
  return (
    <div className="recipe-ranking">
      {/* 並べ替え・絞り込みコントロール */}
      <div className="ranking-controls">
        <div className="sort-controls">
          <label>並べ替え:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
            {sortOrder === 'asc' ? '↑ 昇順' : '↓ 降順'}
          </button>
        </div>
        
        <div className="filter-controls">
          <label>フィルター:</label>
          <select>
            <option value="">ジャンル指定なし</option>
            <option value="japanese">🍱 和食</option>
            <option value="chinese">🥘 中華</option>
            <option value="western">🍝 洋食</option>
          </select>
          <select>
            <option value="">香り系統指定なし</option>
            <option value="herbal">🌿 ハーブ香</option>
            <option value="spice">🌶️ スパイス香</option>
            ...
          </select>
          <label>
            <input type="checkbox" /> お気に入りのみ
          </label>
        </div>
      </div>
      
      {/* 結果一覧 */}
      <ul className="ranking-list">
        {results.map((recipe, index) => (
          <li key={recipe.recipe_id} className={`rank-${index + 1}`}>
            <span className="rank-number">{index + 1}</span>
            <RadarChartMini data={recipe.taste_score} />
            <span className="recipe-title">{recipe.title}</span>
            <span className="score-value">
              {sortBy}: {recipe.scores[sortBy]}
            </span>
            <button onClick={() => onSelect(recipe.recipe_id)}>編集する</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 2.8 バッチ処理設計（Epicure解析結果の蓄積）

#### 2.8.1 taste_profile計算サービス

既存設計（[`csv-import-and-taste-profile-design.md`](../architecture/csv-import-and-taste-profile-design.md) §6）を参照。

**追加機能:** taste_scores（Jev評価結果）との連携。

```
バッチ処理フロー:
  1. Data.csvからレシピを取得
  2. Epicureマッピング（ingredients → epicure_node_id）
  3. Epicureベクトル合成（taste_json計算）
  4. taste_profilesテーブルに保存
  5. Jev評価実行 → taste_scoresテーブルに保存
     - 味覚6軸（sweet, salty, bitter, spicy, umami, overall）
     - 香り2軸（aroma_intensity, aroma_family）
     - 食感2軸（texture_intensity, texture_profile）
     - 用途プロファイル（オンザフライ計算、taste_profiles.function_profile_jsonに保存）
     - 栄養プロファイル（オンザフライ計算、taste_profiles.nutrition_profile_jsonに保存）
```

#### 2.8.2 インデックス戦略

| テーブル | インデックス | 目的 |
|----------|-------------|------|
| `taste_scores` | GIN on `raw_json` | Jev生レスポンス検索 |
| `taste_scores` | B-tree on `overall`, `confidence` | ランキング・フィルタ |
| `taste_scores` | B-tree on `aroma_intensity` | 香り強度フィルタ |
| `taste_scores` | B-tree on `texture_intensity` | 食感強度フィルタ |
| `taste_scores` | B-tree on `aroma_family` | 香り系統フィルタ |
| `taste_scores` | B-tree on `texture_profile` | 食感系統フィルタ |
| `taste_profiles` | GIN on `taste_json` | Epicureベクトル合成結果検索 |
| `taste_profiles` | GIN on `function_profile_json` | 用途プロファイル検索 |
| `taste_profiles` | GIN on `nutrition_profile_json` | 栄養プロファイル検索 |

### 2.9 パフォーマンス考慮

#### 2.9.1 検索パフォーマンス

| シナリオ | 見積もり | 対策 |
|----------|---------|------|
| 1万レシピの類似度検索 | < 100ms | taste_scoresインデックス活用 |
| 10万レシピの類似度検索 | < 500ms | pgvector拡張検討（§2.9.2） |
| 223万レシピの類似度検索 | < 1秒 | クラスタリング＋フィルタリング |

#### 2.9.2 pgvector拡張の検討

将来、レシピ数が膨大になった場合、**pgvector拡張**を使用してEpicure 300次元ベクトルを
ベクトルデータベースとして扱うことを検討する。

```sql
-- pgvector拡張の有効化
CREATE EXTENSION vector;

-- taste_profilesにベクトル列を追加
ALTER TABLE taste_profiles ADD COLUMN epicure_vector vector(300);

-- 類似度検索（Haversine距離）
SELECT recipe_id, title
FROM taste_profiles
ORDER BY epicure_vector <#> target_vector
LIMIT 10;
```

> **設計判断:** PoCではtaste_scores（6軸）の類似度検索で十分。
> Epicure 300次元ベクトルの全特徴量を使うのは、将来のフェーズ2以降。

---

## 3. UI/UX提案（拡張版）

### 3.1 全体画面構成

```
┌─────────────────────────────────────────────────────────────┐
│  味覚AIエンジン PoC                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [トップ]  [レシピ選択]  [バルク生成]  [比較]               │
│  ──────  ──────────  ──────────  ─────                     │
│                                                             │
│  ┌───────────────────────────────────────────────────┐     │
│  │ レシピ選択メニュー                                 │     │
│  ├───────────────────────────────────────────────────┤     │
│  │                                                   │     │
│  │  [検索]  [味で探す]  [ジャンル]                   │     │
│  │  ─────  ─────────  ───────                        │     │
│  │                                                   │     │
│  │  ▸ 味で探すタブ（デフォルト）                      │     │
│  │  ┌─────────────────┐  ┌─────────────────────┐    │     │
│  │  │ チャートタブ    │  │ 並べ替え・絞り込み   │    │     │
│  │  │                 │  │                     │    │     │
│  │  │ [味] [香り]     │  │ ▸ 並べ替え:         │    │     │
│  │  │ [食感] [用途]   │  │   うま味 ▼ 降順 ▼  │    │     │
│  │  │ [栄養]          │  │                     │    │     │
│  │  │ ────────────    │  │ ▸ フィルタ:         │    │     │
│  │  │                 │  │   和食 ▼ ハーブ香 ▼│    │     │
│  │  │   甘さ ●        │  │                     │    │     │
│  │  │  /    \         │  │ [検索実行]          │    │     │
│  │  │ 塩味    うま味   │  │                     │    │     │
│  │  │  \    /         │  │ ────────────────    │    │     │
│  │  │   辛味          │  │ 検索結果             │    │     │
│  │  │                 │  │                     │    │     │
│  │  │ [この味で検索]  │  │ 1. 和風カレー       │    │     │
│  │  └─────────────────┘  │    うま味: 78      │    │     │
│  │                       │    類似度: 95%      │    │     │
│  │  ┌─────────────────┐  │                     │    │     │
│  │  │ 検索結果         │  │ 2. 辛口カレー       │    │     │
│  │  │                 │  │    うま味: 75      │    │     │
│  │  │ 1. 和風カレー   │  │    類似度: 88%      │    │     │
│  │  │    類似度: 95%  │  │                     │    │     │
│  │  │ [編集する]      │  │ ...                 │    │     │
│  │  │                 │  │                     │    │     │
│  │  │ 2. 辛口カレー   │  │                     │    │     │
│  │  │    類似度: 88%  │  │                     │    │     │
│  │  │ [編集する]      │  │                     │    │     │
│  │  └─────────────────┘  └─────────────────────┘    │     │
│  │                                                   │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 味で探すタブの詳細UX

#### 3.2.1 チャートタブ操作

1. **初期状態:** 全軸が中央（50点）に配置されたチャートを表示
2. **ドラッグ操作:** ユーザーが各軸の点をドラッグして味の好みを変更
3. **リアルタイム更新:** ドラッグ中にチャートがリアルタイムで更新
4. **数値表示:** 各軸の値を数値でも表示（0〜100）
5. **プリセット:** よくある味の組み合わせをプリセットとして提供
   - 「甘口」「辛口」「旨味重視」「あっさり」等

#### 3.2.2 並べ替え・絞り込みUI

```
┌─────────────────────────────────────┐
│ 並べ替え・絞り込み                   │
├─────────────────────────────────────┤
│                                     │
│ ▸ 並べ替え:                          │
│   [うま味 ▼] [降順 ▼]               │
│                                     │
│ ▸ フィルタ:                          │
│   ジャンル: [和食 ▼]                │
│   香り系統: [ハーブ香 ▼]            │
│   食感系統: [ほろほろ ▼]            │
│   お気に入りのみ: [☐]               │
│   最小信頼度: [0.5 ▼]               │
│                                     │
│ [検索実行]                           │
└─────────────────────────────────────┘
```

#### 3.2.3 検索結果表示

1. **類似度順ソート:** 類似度が高い順に並べる
2. **ミニレーダーチャート:** 各レシピの味をミニチャートで表示
3. **ワンクリック編集:** 「編集する」ボタンでレシピ詳細画面へ遷移
4. **フィルタ追加:** 検索結果にジャンル・お気に入りフィルタを追加可能

### 3.3 ジャンルで探すタブの詳細UX

#### 3.3.1 ジャンル選択UI

```
┌─────────────────────────────────────┐
│ ジャンル選択                         │
├─────────────────────────────────────┤
│                                     │
│  🍱 和食                            │
│  🥘 中華                            │
│  🍝 洋食                            │
│  🍰 スイーツ                        │
│  🌍 その他                          │
│                                     │
│  [検索]                             │
└─────────────────────────────────────┘
```

### 3.4 検索タブの詳細UX

#### 3.4.1 フリーワード検索UI

```
┌─────────────────────────────────────┐
│ キーワード検索                       │
├─────────────────────────────────────┤
│                                     │
│  🔍 [カレー]                        │
│     [検索]                          │
│                                     │
│  検索履歴:                           │
│  ・カレー                            │
│  ・パスタ                            │
│  ・サラダ                            │
│                                     │
│  人気キーワード:                     │
│  ・カレー ・パスタ ・ラーメン          │
└─────────────────────────────────────┘
```

---

## 4. 実装フェーズ（推奨）

| フェーズ | 内容 | 依存 |
|----------|------|------|
| 1 | `taste_search_service.py`（類似度計算、複数チャート対応） | taste_scoresテーブル |
| 2 | `/api/recipes/search-by-taste` API（拡張版） | フェーズ1 |
| 3 | `/api/recipes/ranking` API（並べ替え・絞り込み） | フェーズ1 |
| 4 | マルチチャート検索コンポーネント（Next.js） | フェーズ2, 3 |
| 5 | taste_profilesインデックス最適化 | DBマイグレーション |
| 6 | プリセット味パターン追加 | フェーズ4 |
| 7 | pgvector拡張の検討（将来） | レシピ数増加 |

---

## 5. 未確定事項（要確認）

1. **類似度計算の重み付け:** 全チャートを均等に扱うか、ユーザーが重みを調整可能にするか
2. **最小サンプル数:** 検索に必要な最小レシピ数（PoCでは100件程度で開始）
3. **pgvector拡張の必要性:** PoC規模ではtaste_scoresの6軸類似度で十分か
4. **キャッシュ戦略:** 頻繁に検索される味パターンの結果をキャッシュするか
5. **香り系統・食感系統のフィルタリング:** DBインデックスの効果的な活用方法

---

## 6. 関連ドキュメント

- [`ui-design.md`](ui-design.md) - 既存UI設計
- [`csv-import-and-taste-profile-design.md`](../architecture/csv-import-and-taste-profile-design.md) - Epicure解析設計
- [`taste-evaluation-design.md`](../architecture/taste-evaluation-design.md) - Jev評価設計
- [`api-spec-details.md`](../api/api-spec-details.md) - API仕様
