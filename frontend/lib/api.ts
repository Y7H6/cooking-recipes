'use client';

import {
  TasteVector,
  AromaVector,
  TextureVector,
  FunctionVector,
  NutritionVector,
  SearchResponse,
  RankingFilter,
  RankingResponse,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================================================
// searchByTaste - 味覚ベクトルで検索
// ============================================================================

export async function searchByTaste(params: {
  taste?: TasteVector;
  aroma?: AromaVector;
  texture?: TextureVector;
  function?: FunctionVector;
  nutrition?: NutritionVector;
  sort_by?: string;
  sort_order?: string;
  min_confidence?: number;
  limit?: number;
  offset?: number;
}): Promise<SearchResponse> {
  const response = await fetch(`${API_BASE}/api/recipes/search-by-taste`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Search API error: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// searchByKeyword - キーワードでレシピ検索
// ============================================================================

export async function searchByKeyword(query: string, limit?: number): Promise<SearchResponse> {
  const response = await fetch(
    `${API_BASE}/api/recipes/search?keyword=${encodeURIComponent(query)}${limit ? `&limit=${limit}` : ''}`,
    { method: 'GET' },
  );

  if (!response.ok) {
    throw new Error(`Search API error: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// getRanking - ランキング取得
// ============================================================================

export async function getRanking(params: {
  sort_by: string;
  sort_order?: string;
  filters?: RankingFilter;
  limit?: number;
  offset?: number;
}): Promise<RankingResponse> {
  const response = await fetch(`${API_BASE}/api/recipes/ranking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Ranking API error: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// getRecipeDetail - レシピ詳細取得
// ============================================================================

export async function getRecipeDetail(recipeId: number): Promise<any> {
  const response = await fetch(`${API_BASE}/api/recipes/${recipeId}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Recipe detail API error: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// evaluateRecipe - レシピ評価
// ============================================================================

export async function evaluateRecipe(recipeData: Record<string, unknown>): Promise<any> {
  const response = await fetch(`${API_BASE}/api/recipes/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipeData),
  });

  if (!response.ok) {
    throw new Error(`Evaluate API error: ${response.status}`);
  }

  return response.json();
}
