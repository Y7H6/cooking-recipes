'use client';

import React from 'react';
import { useSearchStore } from '../store/search-store';
import { ActiveTab } from '../lib/types';
import { SearchTab } from './SearchTab';
import { TasteSearchTab } from './TasteSearchTab';
import { GenreSearchTab } from './GenreSearchTab';
import { SearchRecipeResult } from '../lib/types';

const TABS: Array<{ key: ActiveTab; label: string }> = [
  { key: 'search', label: '検索' },
  { key: 'taste', label: '味で探す' },
  { key: 'genre', label: 'ジャンルで探す' },
];

interface RecipeSelectionMenuProps {
  onResults?: (results: SearchRecipeResult[]) => void;
}

export function RecipeSelectionMenu({ onResults }: RecipeSelectionMenuProps) {
  const activeTab = useSearchStore((s) => s.activeTab);
  const setActiveTab = useSearchStore((s) => s.setActiveTab);

  return (
    <div className="recipe-selection-menu">
      <div className="menu-header">
        <h1>レシピ選択メニュー</h1>
      </div>

      <div className="tab-buttons">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'search' && <SearchTab onResults={onResults} />}
        {activeTab === 'taste' && <TasteSearchTab onResults={onResults} />}
        {activeTab === 'genre' && <GenreSearchTab />}
      </div>
    </div>
  );
}
