'use client';

import React, { useState } from 'react';
import { searchByKeyword } from '../lib/api';
import { SearchRecipeResult } from '../lib/types';

interface SearchTabProps {
  onResults?: (results: SearchRecipeResult[]) => void;
}

export function SearchTab({ onResults }: SearchTabProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const results = await searchByKeyword(query.trim(), 10);
      onResults?.(results.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : '検索中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="search-tab">
      <div className="search-input-group">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="レシピ名や材料で検索..."
          className="search-input"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="search-button"
        >
          {loading ? '検索中...' : '検索'}
        </button>
      </div>

      {error && (
        <div className="search-error">
          {error}
        </div>
      )}

      <div className="search-hint">
        <p>例: "パスタ", "鶏肉", "野菜炒め"</p>
      </div>
    </div>
  );
}
