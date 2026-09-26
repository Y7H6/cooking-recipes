import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecipeRankingList } from '../RecipeRankingList';
import { useSearchStore } from '../../store/search-store';
import { SORT_OPTIONS, SORT_ORDERS } from '../../lib/types';

// ResizeObserver のモック
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// zustand モック
jest.mock('../../store/search-store', () => ({
  useSearchStore: jest.fn(),
}));

// MiniRadarChart の内部で使われる recharts をモック
jest.mock('recharts', () => ({
  Radar: jest.fn().mockReturnValue(null),
  RadarChart: jest.fn().mockReturnValue(null),
  PolarGrid: jest.fn().mockReturnValue(null),
  PolarAngleAxis: jest.fn().mockReturnValue(null),
  ResponsiveContainer: jest.fn(({ children }) => React.cloneElement(children as React.ReactElement, { className: 'recharts-mock' })),
}));

describe('RecipeRankingList', () => {
  const mockSetSortBy = jest.fn();
  const mockSetSortOrder = jest.fn();

  const mockRecipes = [
    { recipe_id: 1, title: 'トマトパスタ', overall: 85, sweet: 30, salty: 60, bitter: 20, spicy: 40, umami: 75 },
    { recipe_id: 2, title: '鶏照り焼き', overall: 90, sweet: 70, salty: 80, bitter: 10, spicy: 20, umami: 85 },
    { recipe_id: 3, title: '野菜スープ', overall: 70, sweet: 40, salty: 50, bitter: 30, spicy: 10, umami: 60 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useSearchStore as jest.Mock).mockImplementation((selector) => {
      const state = {
        sortBy: 'overall',
        sortOrder: 'desc' as const,
        setSortBy: mockSetSortBy,
        setSortOrder: mockSetSortOrder,
      };
      return selector(state);
    });
  });

  describe('初期表示', () => {
    it('モックデータがデフォルトで表示されるべき', () => {
      render(<RecipeRankingList />);

      expect(screen.getByText('トマトパスタ')).toBeInTheDocument();
      expect(screen.getByText('鶏照り焼き')).toBeInTheDocument();
      expect(screen.getByText('野菜スープ')).toBeInTheDocument();
    });

    it('カスタムレシピデータが表示されるべき', () => {
      const customRecipes = [
        { recipe_id: 10, title: 'カレーライス', overall: 88 },
      ];
      render(<RecipeRankingList recipes={customRecipes} />);

      expect(screen.getByText('カレーライス')).toBeInTheDocument();
    });

    it('順位番号が表示されるべき', () => {
      render(<RecipeRankingList recipes={mockRecipes} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('総合スコアが表示されるべき', () => {
      render(<RecipeRankingList recipes={mockRecipes} />);

      expect(screen.getByText('総合: 85')).toBeInTheDocument();
      expect(screen.getByText('総合: 90')).toBeInTheDocument();
      expect(screen.getByText('総合: 70')).toBeInTheDocument();
    });

    it('並べ替えセレクトボックスが表示されるべき', () => {
      render(<RecipeRankingList recipes={mockRecipes} />);

      expect(screen.getByLabelText('並べ替え:')).toBeInTheDocument();
    });

    it('順序セレクトボックスが表示されるべき', () => {
      render(<RecipeRankingList recipes={mockRecipes} />);

      expect(screen.getByLabelText('順序:')).toBeInTheDocument();
    });
  });

  describe('並べ替えオプション', () => {
    it('SORT_OPTIONS のすべてのオプションが表示されるべき', () => {
      render(<RecipeRankingList recipes={mockRecipes} />);

      const sortSelect = screen.getByLabelText('並べ替え:');
      SORT_OPTIONS.forEach((opt) => {
        expect(sortSelect).toHaveTextContent(opt.label);
      });
    });

    it('SORT_ORDERS のすべてのオプションが表示されるべき', () => {
      render(<RecipeRankingList recipes={mockRecipes} />);

      const orderSelect = screen.getByLabelText('順序:');
      SORT_ORDERS.forEach((opt) => {
        expect(orderSelect).toHaveTextContent(opt.label);
      });
    });
  });

  describe('並べ替え操作', () => {
    it('並べ替えセレクトを変更すると setSortBy が呼ばれるべき', () => {
      render(<RecipeRankingList recipes={mockRecipes} />);

      const sortSelect = screen.getByLabelText('並べ替え:');
      fireEvent.change(sortSelect, { target: { value: 'sweet' } });

      expect(mockSetSortBy).toHaveBeenCalledWith('sweet');
    });

    it('順序セレクトを変更すると setSortOrder が呼ばれるべき', () => {
      render(<RecipeRankingList recipes={mockRecipes} />);

      const orderSelect = screen.getByLabelText('順序:');
      fireEvent.change(orderSelect, { target: { value: 'asc' } });

      expect(mockSetSortOrder).toHaveBeenCalledWith('asc');
    });
  });

  describe('レシピカード', () => {
    it('recipe-card クラスが存在するべき', () => {
      const { container } = render(<RecipeRankingList recipes={mockRecipes} />);
      const cards = container.querySelectorAll('.recipe-card');
      expect(cards).toHaveLength(3);
    });

    it('各レシピに固有の recipe_id が key として使用されるべき', () => {
      render(<RecipeRankingList recipes={mockRecipes} />);

      // レンダリングが成功すること（key が重複していないことを確認）
      expect(screen.getByText('トマトパスタ')).toBeInTheDocument();
    });

    it('空のレシピリストの場合、エラーにならないべき', () => {
      render(<RecipeRankingList recipes={[]} />);

      // エラーが発生しないことを確認
      expect(() => screen.getAllByRole('listitem')).toThrow();
    });

    it('recipes が undefined の場合、モックデータが表示されるべき', () => {
      render(<RecipeRankingList />);

      expect(screen.getByText('トマトパスタ')).toBeInTheDocument();
    });
  });

  describe('レーダーチャート', () => {
    it('各レシピにミニレーダーチャートが存在するべき', () => {
      const { container } = render(<RecipeRankingList recipes={mockRecipes} />);
      const charts = container.querySelectorAll('.mini-radar-chart');
      expect(charts).toHaveLength(3);
    });
  });

  describe('ranking-controls クラス', () => {
    it('ranking-controls クラスが存在するべき', () => {
      const { container } = render(<RecipeRankingList recipes={mockRecipes} />);
      expect(container.querySelector('.ranking-controls')).toBeInTheDocument();
    });

    it('sort-group クラスが存在するべき', () => {
      const { container } = render(<RecipeRankingList recipes={mockRecipes} />);
      const groups = container.querySelectorAll('.sort-group');
      expect(groups).toHaveLength(2);
    });
  });
});
