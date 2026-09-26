'use client';

import React from 'react';
import { useSearchStore } from '../store/search-store';
import { SORT_OPTIONS, SORT_ORDERS, RadarChartData } from '../lib/types';
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';

// モックデータ（API接続前にプレビュー用）
const MOCK_RECIPES = [
  { recipe_id: 1, title: 'トマトパスタ', overall: 85, sweet: 30, salty: 60, bitter: 20, spicy: 40, umami: 75 },
  { recipe_id: 2, title: '鶏照り焼き', overall: 90, sweet: 70, salty: 80, bitter: 10, spicy: 20, umami: 85 },
  { recipe_id: 3, title: '野菜スープ', overall: 70, sweet: 40, salty: 50, bitter: 30, spicy: 10, umami: 60 },
  { recipe_id: 4, title: 'チョコレートケーキ', overall: 88, sweet: 95, salty: 10, bitter: 60, spicy: 0, umami: 5 },
  { recipe_id: 5, title: 'サラダチキン', overall: 75, sweet: 10, salty: 65, bitter: 5, spicy: 15, umami: 70 },
];

interface RecipeRankingListProps {
  recipes?: Array<{ recipe_id: number; title: string } & Record<string, number>>;
}

function MiniRadarChart({ data }: { data: RadarChartData[] }) {
  return (
    <div className="mini-radar-chart">
      <ResponsiveContainer width={100} height={80}>
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="60%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="attribute" tick={{ fontSize: 6 }} />
          <Radar name="味" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.5} />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RecipeRankingList({ recipes: propRecipes }: RecipeRankingListProps) {
  const sortBy = useSearchStore((s) => s.sortBy);
  const sortOrder = useSearchStore((s) => s.sortOrder);
  const setSortBy = useSearchStore((s) => s.setSortBy);
  const setSortOrder = useSearchStore((s) => s.setSortOrder);

  const recipes = propRecipes || MOCK_RECIPES;

  const getRadarData = (recipe: typeof MOCK_RECIPES[0]): RadarChartData[] => [
    { attribute: '甘さ', value: recipe.sweet, fullMark: 100 },
    { attribute: '塩気', value: recipe.salty, fullMark: 100 },
    { attribute: '苦み', value: recipe.bitter, fullMark: 100 },
    { attribute: '辛味', value: recipe.spicy, fullMark: 100 },
    { attribute: 'うまみ', value: recipe.umami, fullMark: 100 },
  ];

  return (
    <div className="recipe-ranking-list">
      <div className="ranking-controls">
        <div className="sort-group">
          <label htmlFor="sort-by" className="sort-label">
            並べ替え:
          </label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sort-group">
          <label htmlFor="sort-order" className="sort-label">
            順序:
          </label>
          <select
            id="sort-order"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="sort-select"
          >
            {SORT_ORDERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ranking-results">
        {recipes.map((recipe, index) => (
          <div key={recipe.recipe_id} className="recipe-card">
            <div className="recipe-rank">
              <span className="rank-number">{index + 1}</span>
            </div>

            <div className="recipe-info">
              <h3 className="recipe-title">{recipe.title}</h3>
              <div className="recipe-scores">
                <span className="score-item">総合: {recipe.overall}</span>
              </div>
            </div>

            <MiniRadarChart data={getRadarData(recipe as typeof MOCK_RECIPES[0])} />
          </div>
        ))}
      </div>
    </div>
  );
}
