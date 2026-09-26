// ============================================================================
// TasteVector - 味覚ベクトル
// ============================================================================

export interface TasteVector {
  sweet: number;
  salty: number;
  bitter: number;
  spicy: number;
  umami: number;
  overall: number;
}

// ============================================================================
// AromaVector - 香りベクトル
// ============================================================================

export interface AromaVector {
  intensity: number;
  family: string | null;
  family_probabilities?: Record<string, number>;
}

// ============================================================================
// TextureVector - 食感ベクトル
// ============================================================================

export interface TextureVector {
  intensity: number;
  profile: string | null;
  profile_probabilities?: Record<string, number>;
}

// ============================================================================
// FunctionVector - 用途・機能ベクトル
// ============================================================================

export interface FunctionVector {
  thickener: number;
  sweetener: number;
  souring_agent: number;
  umami_booster: number;
  aromatic_base: number;
  fat_source: number;
}

// ============================================================================
// NutritionVector - 栄養ベクトル
// ============================================================================

export interface NutritionVector {
  high_fat: number;
  high_protein: number;
  high_carb: number;
  fiber_rich: number;
  vitamin_rich: number;
  low_calorie: number;
}

// ============================================================================
// SearchRecipeResult - 検索結果レシピ
// ============================================================================

export interface SearchRecipeResult {
  recipe_id: number;
  title: string;
  taste_score: TasteVector & { confidence: number };
  aroma: AromaVector;
  texture: TextureVector;
  function_profile: FunctionVector;
  nutrition_profile: NutritionVector;
  similarity_score: number;
}

// ============================================================================
// SearchResponse - 検索レスポンス
// ============================================================================

export interface SearchResponse {
  results: SearchRecipeResult[];
  total: number;
  search_params: {
    taste: TasteVector;
    aroma: AromaVector;
    texture: TextureVector;
    function: FunctionVector;
    nutrition: NutritionVector;
  };
}

// ============================================================================
// RankingFilter - ランキング絞り込み条件
// ============================================================================

export interface RankingFilter {
  genre?: string;
  aroma_family?: string;
  texture_profile?: string;
  min_confidence?: number;
  favorite_only?: boolean;
}

// ============================================================================
// RankingResponse - ランキングレスポンス
// ============================================================================

export interface RankingResponse {
  ranking: Array<{
    recipe_id: number;
    title: string;
    [key: string]: number | string;
  }>;
  total: number;
  sort_by: string;
  sort_order: string;
}

// ============================================================================
// ChartTab - チャートタブ種類
// ============================================================================

export type ChartTab = 'taste' | 'aroma' | 'texture' | 'function' | 'nutrition';

// ============================================================================
// ActiveTab - メインタブ種類
// ============================================================================

export type ActiveTab = 'search' | 'taste' | 'genre';

// ============================================================================
// SortOption - 並べ替えオプション
// ============================================================================

export const SORT_OPTIONS = [
  { value: 'overall', label: '総合スコア' },
  { value: 'sweet', label: '甘さ' },
  { value: 'salty', label: '塩気' },
  { value: 'bitter', label: '苦み' },
  { value: 'spicy', label: '辛味' },
  { value: 'umami', label: 'うまみ' },
  { value: 'similarity', label: '類似度' },
] as const;

export const SORT_ORDERS = [
  { value: 'desc', label: '降順 (大きい順)' },
  { value: 'asc', label: '昇順 (小さい順)' },
] as const;

// ============================================================================
// SliderValue - スライダー値（0-100）
// ============================================================================

export interface SliderValue {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
  max?: number;
}

// ============================================================================
// RadarChartData - レーダーチャートデータ
// ============================================================================

export interface RadarChartData {
  attribute: string;
  value: number;
  fullMark: number;
}
