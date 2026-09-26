import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GenreSearchTab } from '../GenreSearchTab';

// RecipeRankingList のモック
jest.mock('../RecipeRankingList', () => ({
  RecipeRankingList: () => <div data-testid="recipe-ranking-list">レシピランキング</div>,
}));

describe('GenreSearchTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('初期表示', () => {
    it('ジャンルタイトルが表示されるべき', () => {
      render(<GenreSearchTab />);

      expect(screen.getByText('ジャンルで探す')).toBeInTheDocument();
    });

    it('すべてのジャンルボタンが表示されるべき', () => {
      render(<GenreSearchTab />);

      expect(screen.getByText('和食')).toBeInTheDocument();
      expect(screen.getByText('中華')).toBeInTheDocument();
      expect(screen.getByText('洋食')).toBeInTheDocument();
      expect(screen.getByText('アジア')).toBeInTheDocument();
      expect(screen.getByText('デザート')).toBeInTheDocument();
      expect(screen.getByText('スープ')).toBeInTheDocument();
      expect(screen.getByText('サラダ')).toBeInTheDocument();
      expect(screen.getByText('飲み物')).toBeInTheDocument();
    });

    it('デフォルトでどのジャンルも選択されていないべき', () => {
      render(<GenreSearchTab />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).not.toHaveClass('active');
      });
    });

    it('RecipeRankingList が表示されるべき', () => {
      render(<GenreSearchTab />);

      expect(screen.getByTestId('recipe-ranking-list')).toBeInTheDocument();
    });
  });

  describe('ジャンル選択', () => {
    it('和食ボタンをクリックすると active 状態になるべき', () => {
      render(<GenreSearchTab />);

      const japaneseButton = screen.getByText('和食').closest('button');
      fireEvent.click(japaneseButton!);

      expect(japaneseButton).toHaveClass('active');
    });

    it('中華ボタンをクリックすると active 状態になるべき', () => {
      render(<GenreSearchTab />);

      const chineseButton = screen.getByText('中華').closest('button');
      fireEvent.click(chineseButton!);

      expect(chineseButton).toHaveClass('active');
    });

    it('洋食ボタンをクリックすると active 状態になるべき', () => {
      render(<GenreSearchTab />);

      const westernButton = screen.getByText('洋食').closest('button');
      fireEvent.click(westernButton!);

      expect(westernButton).toHaveClass('active');
    });

    it('異なるジャンルを選択すると、前の active 状態が解除されるべき', () => {
      render(<GenreSearchTab />);

      const japaneseButton = screen.getByText('和食').closest('button');
      const chineseButton = screen.getByText('中華').closest('button');

      // 和食を選択
      fireEvent.click(japaneseButton!);
      expect(japaneseButton).toHaveClass('active');

      // 中華を選択
      fireEvent.click(chineseButton!);
      expect(japaneseButton).not.toHaveClass('active');
      expect(chineseButton).toHaveClass('active');
    });

    it('すべてのジャンルボタンがクリック可能であるべき', () => {
      render(<GenreSearchTab />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(() => fireEvent.click(button)).not.toThrow();
      });
    });
  });

  describe('UI 構造', () => {
    it('genre-search-header クラスが存在するべき', () => {
      const { container } = render(<GenreSearchTab />);
      expect(container.querySelector('.genre-search-header')).toBeInTheDocument();
    });

    it('genre-grid クラスが存在するべき', () => {
      const { container } = render(<GenreSearchTab />);
      expect(container.querySelector('.genre-grid')).toBeInTheDocument();
    });

    it('genre-search-content クラスが存在するべき', () => {
      const { container } = render(<GenreSearchTab />);
      expect(container.querySelector('.genre-search-content')).toBeInTheDocument();
    });

    it('h2 タグでタイトルが囲まれるべき', () => {
      render(<GenreSearchTab />);

      const title = screen.getByText('ジャンルで探す');
      expect(title.tagName).toBe('H2');
    });
  });

  describe('ボタンスタイル', () => {
    it('genre-button クラスがボタンに付与されるべき', () => {
      render(<GenreSearchTab />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('genre-button');
      });
    });
  });
});
