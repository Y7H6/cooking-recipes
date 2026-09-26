'use client';

import React, { useState } from 'react';
import { RecipeRankingList } from './RecipeRankingList';

const GENRES = [
  { value: 'japanese', label: '和食' },
  { value: 'chinese', label: '中華' },
  { value: 'western', label: '洋食' },
  { value: 'asian', label: 'アジア' },
  { value: 'dessert', label: 'デザート' },
  { value: 'soup', label: 'スープ' },
  { value: 'salad', label: 'サラダ' },
  { value: 'drink', label: '飲み物' },
];

export function GenreSearchTab() {
  const [selectedGenre, setSelectedGenre] = useState<string>('');

  return (
    <div className="genre-search-tab">
      <div className="genre-search-header">
        <h2>ジャンルで探す</h2>
      </div>

      <div className="genre-grid">
        {GENRES.map((genre) => (
          <button
            key={genre.value}
            className={`genre-button ${selectedGenre === genre.value ? 'active' : ''}`}
            onClick={() => setSelectedGenre(genre.value)}
          >
            {genre.label}
          </button>
        ))}
      </div>

      <div className="genre-search-content">
        <RecipeRankingList />
      </div>
    </div>
  );
}
