import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SearchTab } from '../SearchTab';
import * as api from '../../lib/api';

// API モック
jest.mock('../../lib/api', () => ({
  searchByKeyword: jest.fn(),
}));

describe('SearchTab', () => {
  const mockOnResults = jest.fn();
  const mockSearchByKeyword = api.searchByKeyword as jest.MockedFunction<typeof api.searchByKeyword>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('初期表示', () => {
    it('検索入力フィールドが表示されるべき', () => {
      render(<SearchTab onResults={mockOnResults} />);

      const input = screen.getByPlaceholderText(/レシピ名や材料で検索/i);
      expect(input).toBeInTheDocument();
    });

    it('検索ボタンが表示されるべき', () => {
      render(<SearchTab onResults={mockOnResults} />);

      expect(screen.getByText('検索')).toBeInTheDocument();
    });

    it('空の入力の場合、検索ボタンが無効であるべき', () => {
      render(<SearchTab onResults={mockOnResults} />);

      const button = screen.getByText('検索');
      expect(button).toBeDisabled();
    });

    it('検索ヒントが表示されるべき', () => {
      render(<SearchTab onResults={mockOnResults} />);

      expect(screen.getByText(/例: "パスタ", "鶏肉"/i)).toBeInTheDocument();
    });
  });

  describe('入力操作', () => {
    it('テキストを入力するとボタンの状態が有効になるべき', () => {
      render(<SearchTab onResults={mockOnResults} />);

      const input = screen.getByPlaceholderText(/レシピ名や材料で検索/i);
      const button = screen.getByText('検索');

      fireEvent.change(input, { target: { value: 'カレー' } });

      expect(button).toBeEnabled();
    });

    it('入力を消去するとボタンの状態が無効になるべき', () => {
      render(<SearchTab onResults={mockOnResults} />);

      const input = screen.getByPlaceholderText(/レシピ名や材料で検索/i);
      const button = screen.getByText('検索');

      fireEvent.change(input, { target: { value: 'カレー' } });
      expect(button).toBeEnabled();

      fireEvent.change(input, { target: { value: '' } });
      expect(button).toBeDisabled();
    });

    it('空白文字のみの場合、ボタンの状態が無効であるべき', () => {
      render(<SearchTab onResults={mockOnResults} />);

      const input = screen.getByPlaceholderText(/レシピ名や材料で検索/i);
      const button = screen.getByText('検索');

      fireEvent.change(input, { target: { value: '   ' } });
      expect(button).toBeDisabled();
    });
  });

  describe('検索実行', () => {
    it('検索ボタンをクリックすると searchByKeyword が呼ばれるべき', async () => {
      mockSearchByKeyword.mockResolvedValue({
        results: [{ recipe_id: 1, title: 'カレー', taste_score: {}, aroma: {}, texture: {}, function_profile: {}, nutrition_profile: {}, similarity_score: 0.9 }],
        total: 1,
        search_params: { taste: {}, aroma: {}, texture: {}, function: {}, nutrition: {} },
      });

      render(<SearchTab onResults={mockOnResults} />);

      const input = screen.getByPlaceholderText(/レシピ名や材料で検索/i);
      fireEvent.change(input, { target: { value: 'カレー' } });

      await act(async () => {
        fireEvent.click(screen.getByText('検索'));
      });

      expect(mockSearchByKeyword).toHaveBeenCalledWith('カレー', 10);
    });

    it('Enter キーでも検索が実行されるべき', async () => {
      mockSearchByKeyword.mockResolvedValue({
        results: [],
        total: 0,
        search_params: { taste: {}, aroma: {}, texture: {}, function: {}, nutrition: {} },
      });

      render(<SearchTab onResults={mockOnResults} />);

      const input = screen.getByPlaceholderText(/レシピ名や材料で検索/i);
      fireEvent.change(input, { target: { value: 'パスタ' } });

      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      expect(mockSearchByKeyword).toHaveBeenCalledWith('パスタ', 10);
    });

    it('検索中にローディング状態になるべき', async () => {
      // Promise が即座に解決されないようにする
      let resolvePromise: (value: any) => void;
      mockSearchByKeyword.mockImplementation(() => new Promise((resolve) => {
        resolvePromise = resolve;
      }));

      render(<SearchTab onResults={mockOnResults} />);

      const input = screen.getByPlaceholderText(/レシピ名や材料で検索/i);
      fireEvent.change(input, { target: { value: 'カレー' } });

      await act(async () => {
        fireEvent.click(screen.getByText('検索'));
      });

      expect(screen.getByText('検索中...')).toBeInTheDocument();

      // Promise を解決
      await act(async () => {
        resolvePromise!({
          results: [],
          total: 0,
          search_params: { taste: {}, aroma: {}, texture: {}, function: {}, nutrition: {} },
        });
      });
    });

    it('検索完了後に onResults が呼ばれるべき', async () => {
      const mockResults = [
        { recipe_id: 1, title: 'カレー', taste_score: {}, aroma: {}, texture: {}, function_profile: {}, nutrition_profile: {}, similarity_score: 0.9 },
      ];
      mockSearchByKeyword.mockResolvedValue({
        results: mockResults,
        total: 1,
        search_params: { taste: {}, aroma: {}, texture: {}, function: {}, nutrition: {} },
      });

      render(<SearchTab onResults={mockOnResults} />);

      const input = screen.getByPlaceholderText(/レシピ名や材料で検索/i);
      fireEvent.change(input, { target: { value: 'カレー' } });

      await act(async () => {
        fireEvent.click(screen.getByText('検索'));
      });

      expect(mockOnResults).toHaveBeenCalledWith(mockResults);
    });

    it('trim されたクエリが送信されるべき', async () => {
      mockSearchByKeyword.mockResolvedValue({
        results: [],
        total: 0,
        search_params: { taste: {}, aroma: {}, texture: {}, function: {}, nutrition: {} },
      });

      render(<SearchTab onResults={mockOnResults} />);

      const input = screen.getByPlaceholderText(/レシピ名や材料で検索/i);
      fireEvent.change(input, { target: { value: ' カレー ' } });

      await act(async () => {
        fireEvent.click(screen.getByText('検索'));
      });

      expect(mockSearchByKeyword).toHaveBeenCalledWith('カレー', 10);
    });
  });

  describe('エラーハンドリング', () => {
    it('API エラーが発生した場合、エラーメッセージが表示されるべき', async () => {
      mockSearchByKeyword.mockRejectedValue(new Error('ネットワークエラー'));

      render(<SearchTab onResults={mockOnResults} />);

      const input = screen.getByPlaceholderText(/レシピ名や材料で検索/i);
      fireEvent.change(input, { target: { value: 'カレー' } });

      await act(async () => {
        fireEvent.click(screen.getByText('検索'));
      });

      await waitFor(() => {
        expect(screen.getByText('ネットワークエラー')).toBeInTheDocument();
      });
    });

    it('Error 以外の例外が発生した場合、デフォルトメッセージが表示されるべき', async () => {
      mockSearchByKeyword.mockRejectedValue('文字列エラー');

      render(<SearchTab onResults={mockOnResults} />);

      const input = screen.getByPlaceholderText(/レシピ名や材料で検索/i);
      fireEvent.change(input, { target: { value: 'カレー' } });

      await act(async () => {
        fireEvent.click(screen.getByText('検索'));
      });

      await waitFor(() => {
        expect(screen.getByText('検索中にエラーが発生しました')).toBeInTheDocument();
      });
    });
  });
});
