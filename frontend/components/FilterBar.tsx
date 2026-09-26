'use client';

import React from 'react';
import { useSearchStore } from '../store/search-store';

export function FilterBar() {
  const filters = useSearchStore((s) => s.filters);
  const aroma = useSearchStore((s) => s.aroma);
  const texture = useSearchStore((s) => s.texture);
  const setFilters = useSearchStore((s) => s.setFilters);

  const hasActiveFilters = !!(
    filters.genre ||
    filters.aroma_family ||
    filters.texture_profile ||
    filters.min_confidence ||
    filters.favorite_only
  );

  const handleClearAll = () => {
    setFilters({});
  };

  const handleClearGenre = () => {
    setFilters({ ...filters, genre: undefined });
  };

  const handleClearAroma = () => {
    setFilters({ ...filters, aroma_family: undefined });
  };

  const handleClearTexture = () => {
    setFilters({ ...filters, texture_profile: undefined });
  };

  const handleClearFavorite = () => {
    setFilters({ ...filters, favorite_only: undefined });
  };

  if (!hasActiveFilters && !aroma.family && !texture.profile) {
    return null;
  }

  return (
    <div className="filter-bar">
      <div className="filter-tags">
        {filters.genre && (
          <span className="filter-tag">
            ジャンル: {filters.genre}
            <button onClick={handleClearGenre} className="filter-clear-btn">&times;</button>
          </span>
        )}

        {filters.aroma_family && (
          <span className="filter-tag">
            香り: {filters.aroma_family}
            <button onClick={handleClearAroma} className="filter-clear-btn">&times;</button>
          </span>
        )}

        {filters.texture_profile && (
          <span className="filter-tag">
            食感: {filters.texture_profile}
            <button onClick={handleClearTexture} className="filter-clear-btn">&times;</button>
          </span>
        )}

        {filters.favorite_only && (
          <span className="filter-tag">
            おのみ表示
            <button onClick={handleClearFavorite} className="filter-clear-btn">&times;</button>
          </span>
        )}

        {aroma.family && !filters.aroma_family && (
          <span className="filter-tag">
            香り系統: {aroma.family}
          </span>
        )}

        {texture.profile && !filters.texture_profile && (
          <span className="filter-tag">
            食感系統: {texture.profile}
          </span>
        )}
      </div>

      {hasActiveFilters && (
        <button onClick={handleClearAll} className="clear-all-filters-btn">
          全解除
        </button>
      )}
    </div>
  );
}
