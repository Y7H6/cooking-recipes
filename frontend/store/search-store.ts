'use client';

import { create } from 'zustand';
import {
  TasteVector,
  AromaVector,
  TextureVector,
  FunctionVector,
  NutritionVector,
  ActiveTab,
  ChartTab,
  RankingFilter,
} from '../lib/types';

interface SearchState {
  // タブ状態
  activeTab: ActiveTab;
  chartTab: ChartTab;

  // ベクトル値
  taste: TasteVector;
  aroma: AromaVector;
  texture: TextureVector;
  function: FunctionVector;
  nutrition: NutritionVector;

  // 並べ替え設定
  sortBy: string;
  sortOrder: 'asc' | 'desc';

  // フィルター条件
  filters: RankingFilter;

  // アクション
  setActiveTab: (tab: ActiveTab) => void;
  setChartTab: (tab: ChartTab) => void;
  setTaste: (taste: TasteVector) => void;
  setAroma: (aroma: AromaVector) => void;
  setTexture: (texture: TextureVector) => void;
  setFunction: (func: FunctionVector) => void;
  setNutrition: (nutrition: NutritionVector) => void;
  setSortBy: (sortBy: string) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setFilters: (filters: RankingFilter) => void;
  resetAll: () => void;
}

const DEFAULT_TASTE: TasteVector = {
  sweet: 50,
  salty: 50,
  bitter: 50,
  spicy: 50,
  umami: 50,
  overall: 50,
};

const DEFAULT_AROMA: AromaVector = {
  intensity: 50,
  family: null,
};

const DEFAULT_TEXTURE: TextureVector = {
  intensity: 50,
  profile: null,
};

const DEFAULT_FUNCTION: FunctionVector = {
  thickener: 50,
  sweetener: 50,
  souring_agent: 50,
  umami_booster: 50,
  aromatic_base: 50,
  fat_source: 50,
};

const DEFAULT_NUTRITION: NutritionVector = {
  high_fat: 50,
  high_protein: 50,
  high_carb: 50,
  fiber_rich: 50,
  vitamin_rich: 50,
  low_calorie: 50,
};

export const useSearchStore = create<SearchState>((set) => ({
  activeTab: 'taste',
  chartTab: 'taste',

  taste: { ...DEFAULT_TASTE },
  aroma: { ...DEFAULT_AROMA },
  texture: { ...DEFAULT_TEXTURE },
  function: { ...DEFAULT_FUNCTION },
  nutrition: { ...DEFAULT_NUTRITION },

  sortBy: 'overall',
  sortOrder: 'desc' as const,
  filters: {},

  setActiveTab: (activeTab) => set({ activeTab }),

  setChartTab: (chartTab) => set({ chartTab }),

  setTaste: (taste) => set({ taste }),

  setAroma: (aroma) => set({ aroma }),

  setTexture: (texture) => set({ texture }),

  setFunction: (func) => set({ function: func }),

  setNutrition: (nutrition) => set({ nutrition }),

  setSortBy: (sortBy) => set({ sortBy }),

  setSortOrder: (sortOrder) => set({ sortOrder }),

  setFilters: (filters) => set({ filters }),

  resetAll: () =>
    set({
      activeTab: 'taste',
      chartTab: 'taste',
      taste: { ...DEFAULT_TASTE },
      aroma: { ...DEFAULT_AROMA },
      texture: { ...DEFAULT_TEXTURE },
      function: { ...DEFAULT_FUNCTION },
      nutrition: { ...DEFAULT_NUTRITION },
      sortBy: 'overall',
      sortOrder: 'desc',
      filters: {},
    }),
}));
