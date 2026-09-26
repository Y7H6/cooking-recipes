'use client';

import React from 'react';
import { useSearchStore } from '../store/search-store';
import { MultiChartTabs } from './MultiChartTabs';
import { RecipeRankingList } from './RecipeRankingList';
import { FilterBar } from './FilterBar';
import { searchByTaste } from '../lib/api';
import { SearchRecipeResult } from '../lib/types';

interface TasteSearchTabProps {
  onResults?: (results: SearchRecipeResult[]) => void;
}

export function TasteSearchTab({ onResults }: TasteSearchTabProps) {
  const sortBy = useSearchStore((s) => s.sortBy);
  const sortOrder = useSearchStore((s) => s.sortOrder);
  const filters = useSearchStore((s) => s.filters);
  const taste = useSearchStore((s) => s.taste);
  const aroma = useSearchStore((s) => s.aroma);
  const texture = useSearchStore((s) => s.texture);
  const func = useSearchStore((s) => s.function);
  const nutrition = useSearchStore((s) => s.nutrition);
  const resetAll = useSearchStore((s) => s.resetAll);

  const handleSearch = async () => {
    try {
      const results = await searchByTaste({
        taste,
        aroma,
        texture,
        function: func,
        nutrition,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...filters,
        limit: 20,
      });
      onResults?.(results.results);
    } catch (err) {
      console.error('味覚検索エラー:', err);
    }
  };

  return (
    <div className="taste-search-tab">
      <div className="taste-search-header">
        <h2>味で探す</h2>
        <div className="taste-search-actions">
          <button onClick={handleSearch} className="search-button">
            検索
          </button>
          <button onClick={resetAll} className="reset-button">
            全解除
          </button>
        </div>
      </div>

      <FilterBar />

      <div className="taste-search-content">
        <div className="chart-section">
          <MultiChartTabs />
        </div>

        <div className="ranking-section">
          <RecipeRankingList />
        </div>
      </div>
    </div>
  );
}
