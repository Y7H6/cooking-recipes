import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar } from '../FilterBar';
import { useSearchStore } from '../../store/search-store';

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

describe('FilterBar', () => {
  const mockSetFilters = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('フィルターがない場合', () => {
    it('フィルターがない場合、コンポーネントが非表示になるべき', () => {
      (useSearchStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          filters: {},
          aroma: { intensity: 50, family: null },
          texture: { intensity: 50, profile: null },
          setFilters: mockSetFilters,
        };
        return selector(state);
      });

      const { container } = render(<FilterBar />);
      expect(container.querySelector('.filter-bar')).not.toBeInTheDocument();
    });
  });

  describe('フィルターがある場合', () => {
    it('ジャンルフィルターがある場合、タグが表示されるべき', () => {
      (useSearchStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          filters: { genre: 'japanese' },
          aroma: { intensity: 50, family: null },
          texture: { intensity: 50, profile: null },
          setFilters: mockSetFilters,
        };
        return selector(state);
      });

      render(<FilterBar />);

      expect(screen.getByText('ジャンル: japanese')).toBeInTheDocument();
    });

    it('香り系統フィルターがある場合、タグが表示されるべき', () => {
      (useSearchStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          filters: { aroma_family: 'herb' },
          aroma: { intensity: 50, family: null },
          texture: { intensity: 50, profile: null },
          setFilters: mockSetFilters,
        };
        return selector(state);
      });

      render(<FilterBar />);

      expect(screen.getByText('香り: herb')).toBeInTheDocument();
    });

    it('食感系統フィルターがある場合、タグが表示されるべき', () => {
      (useSearchStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          filters: { texture_profile: 'crunchy' },
          aroma: { intensity: 50, family: null },
          texture: { intensity: 50, profile: null },
          setFilters: mockSetFilters,
        };
        return selector(state);
      });

      render(<FilterBar />);

      expect(screen.getByText('食感: crunchy')).toBeInTheDocument();
    });

    it('おのみフィルターがある場合、タグが表示されるべき', () => {
      (useSearchStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          filters: { favorite_only: true },
          aroma: { intensity: 50, family: null },
          texture: { intensity: 50, profile: null },
          setFilters: mockSetFilters,
        };
        return selector(state);
      });

      render(<FilterBar />);

      expect(screen.getByText('おのみ表示')).toBeInTheDocument();
    });

    it('全解除ボタンが表示されるべき', () => {
      (useSearchStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          filters: { genre: 'japanese' },
          aroma: { intensity: 50, family: null },
          texture: { intensity: 50, profile: null },
          setFilters: mockSetFilters,
        };
        return selector(state);
      });

      render(<FilterBar />);

      expect(screen.getByText('全解除')).toBeInTheDocument();
    });
  });

  describe('個別フィルター解除', () => {
    it('ジャンルの解除ボタンをクリックすると genre が undefined になるべき', () => {
      (useSearchStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          filters: { genre: 'japanese', aroma_family: 'herb' },
          aroma: { intensity: 50, family: null },
          texture: { intensity: 50, profile: null },
          setFilters: mockSetFilters,
        };
        return selector(state);
      });

      render(<FilterBar />);

      const clearButtons = screen.getAllByRole('button', { name: /×/i });
      fireEvent.click(clearButtons[0]);

      expect(mockSetFilters).toHaveBeenCalledWith({
        genre: undefined,
        aroma_family: 'herb',
      });
    });

    it('香り系統の解除ボタンをクリックすると aroma_family が undefined になるべき', () => {
      (useSearchStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          filters: { genre: 'japanese', aroma_family: 'herb' },
          aroma: { intensity: 50, family: null },
          texture: { intensity: 50, profile: null },
          setFilters: mockSetFilters,
        };
        return selector(state);
      });

      render(<FilterBar />);

      const clearButtons = screen.getAllByRole('button', { name: /×/i });
      fireEvent.click(clearButtons[1]);

      expect(mockSetFilters).toHaveBeenCalledWith({
        genre: 'japanese',
        aroma_family: undefined,
      });
    });

    it('おのみ解除ボタンをクリックすると favorite_only が undefined になるべき', () => {
      (useSearchStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          filters: { favorite_only: true },
          aroma: { intensity: 50, family: null },
          texture: { intensity: 50, profile: null },
          setFilters: mockSetFilters,
        };
        return selector(state);
      });

      render(<FilterBar />);

      const clearButton = screen.getByRole('button', { name: /×/i });
      fireEvent.click(clearButton);

      expect(mockSetFilters).toHaveBeenCalledWith({
        favorite_only: undefined,
      });
    });
  });

  describe('全解除', () => {
    it('全解除ボタンをクリックすると filters が空になるべき', () => {
      (useSearchStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          filters: { genre: 'japanese', aroma_family: 'herb', favorite_only: true },
          aroma: { intensity: 50, family: null },
          texture: { intensity: 50, profile: null },
          setFilters: mockSetFilters,
        };
        return selector(state);
      });

      render(<FilterBar />);

      const clearAllButton = screen.getByText('全解除');
      fireEvent.click(clearAllButton);

      expect(mockSetFilters).toHaveBeenCalledWith({});
    });
  });

  describe('aroma/texture の family/profile フィルター', () => {
    it('aroma.family がある場合、フィルタータグとして表示されるべき', () => {
      (useSearchStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          filters: {},
          aroma: { intensity: 50, family: 'citrus' },
          texture: { intensity: 50, profile: null },
          setFilters: mockSetFilters,
        };
        return selector(state);
      });

      render(<FilterBar />);

      expect(screen.getByText('香り系統: citrus')).toBeInTheDocument();
    });

    it('texture.profile がある場合、フィルタータグとして表示されるべき', () => {
      (useSearchStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          filters: {},
          aroma: { intensity: 50, family: null },
          texture: { intensity: 50, profile: 'soft' },
          setFilters: mockSetFilters,
        };
        return selector(state);
      });

      render(<FilterBar />);

      expect(screen.getByText('食感系統: soft')).toBeInTheDocument();
    });
  });
});
