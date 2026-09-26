import * as api from '../api';

// fetch のモック
const mockFetch = jest.fn();
global.fetch = mockFetch;

// process.env のモック
const originalEnv = process.env.NEXT_PUBLIC_API_URL;

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_API_URL = originalEnv;
  });

  describe('searchByTaste', () => {
    it('POST リクエストで検索エンドポイントにリクエストするべき', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [], total: 0, search_params: {} }),
      });

      await api.searchByTaste({ taste: { sweet: 50, salty: 50, bitter: 50, spicy: 50, umami: 50, overall: 50 } });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/recipes/search-by-taste',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taste: { sweet: 50, salty: 50, bitter: 50, spicy: 50, umami: 50, overall: 50 },
          }),
        },
      );
    });

    it('複数のパラメータを指定できるべき', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [], total: 0, search_params: {} }),
      });

      await api.searchByTaste({
        taste: { sweet: 60, salty: 40, bitter: 20, spicy: 80, umami: 70, overall: 75 },
        aroma: { intensity: 50, family: 'herb' },
        sort_by: 'overall',
        sort_order: 'desc',
        limit: 10,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/recipes/search-by-taste',
        expect.objectContaining({
          body: JSON.stringify({
            taste: { sweet: 60, salty: 40, bitter: 20, spicy: 80, umami: 70, overall: 75 },
            aroma: { intensity: 50, family: 'herb' },
            sort_by: 'overall',
            sort_order: 'desc',
            limit: 10,
          }),
        }),
      );
    });

    it('API がエラーを返した場合、例外をスローするべき', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(
        api.searchByTaste({ taste: { sweet: 50, salty: 50, bitter: 50, spicy: 50, umami: 50, overall: 50 } }),
      ).rejects.toThrow('Search API error: 500');
    });

    it('レスポンスを正常に返すべき', async () => {
      const mockResponse = {
        results: [{ recipe_id: 1, title: 'カレー' }],
        total: 1,
        search_params: {},
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.searchByTaste({ taste: { sweet: 50, salty: 50, bitter: 50, spicy: 50, umami: 50, overall: 50 } });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('searchByKeyword', () => {
    it('GET リクエストで検索エンドポイントにリクエストするべき', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [], total: 0, search_params: {} }),
      });

      await api.searchByKeyword('カレー');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/recipes/search?keyword=%E3%82%AB%E3%83%AC%E3%83%BC',
        { method: 'GET' },
      );
    });

    it('limit パラメータを指定できるべき', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [], total: 0, search_params: {} }),
      });

      await api.searchByKeyword('パスタ', 20);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/recipes/search?keyword=%E3%83%91%E3%82%B9%E3%82%BF&limit=20',
        { method: 'GET' },
      );
    });

    it('キーワードを URL エンコーディングするべき', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [], total: 0, search_params: {} }),
      });

      await api.searchByKeyword('カレー & ラーメン');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('keyword=%E3%82%AB%E3%83%AC%E3%83%BC'),
        { method: 'GET' },
      );
    });

    it('API がエラーを返した場合、例外をスローするべき', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(api.searchByKeyword('存在しないレシピ')).rejects.toThrow('Search API error: 404');
    });

    it('レスポンスを正常に返すべき', async () => {
      const mockResponse = {
        results: [{ recipe_id: 1, title: 'カレー' }],
        total: 1,
        search_params: {},
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.searchByKeyword('カレー');

      expect(result).toEqual(mockResponse);
    });
  });

  describe('getRanking', () => {
    it('POST リクエストでランキングエンドポイントにリクエストするべき', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ranking: [], total: 0, sort_by: 'overall', sort_order: 'desc' }),
      });

      await api.getRanking({ sort_by: 'umami' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/recipes/ranking',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_by: 'umami' }),
        },
      );
    });

    it('filters パラメータを指定できるべき', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ranking: [], total: 0, sort_by: 'overall', sort_order: 'desc' }),
      });

      await api.getRanking({
        sort_by: 'sweet',
        filters: { genre: 'japanese', min_confidence: 0.5 },
        limit: 10,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/recipes/ranking',
        expect.objectContaining({
          body: JSON.stringify({
            sort_by: 'sweet',
            filters: { genre: 'japanese', min_confidence: 0.5 },
            limit: 10,
          }),
        }),
      );
    });

    it('API がエラーを返した場合、例外をスローするべき', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(api.getRanking({ sort_by: 'overall' })).rejects.toThrow('Ranking API error: 500');
    });

    it('レスポンスを正常に返すべき', async () => {
      const mockResponse = {
        ranking: [{ recipe_id: 1, title: 'カレー', umami: 80 }],
        total: 1,
        sort_by: 'umami',
        sort_order: 'desc',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.getRanking({ sort_by: 'umami' });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('getRecipeDetail', () => {
    it('GET リクエストでレシピ詳細エンドポイントにリクエストするべき', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recipe_id: 1, title: 'カレー' }),
      });

      await api.getRecipeDetail(1);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/recipes/1',
        { method: 'GET' },
      );
    });

    it('API がエラーを返した場合、例外をスローするべき', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(api.getRecipeDetail(999)).rejects.toThrow('Recipe detail API error: 404');
    });

    it('レスポンスを正常に返すべき', async () => {
      const mockResponse = { recipe_id: 1, title: 'カレー' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.getRecipeDetail(1);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('evaluateRecipe', () => {
    it('POST リクエストで評価エンドポイントにリクエストするべき', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ score: 80 }),
      });

      await api.evaluateRecipe({ ingredients: ['鶏肉', 'カレー'] });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/recipes/evaluate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ingredients: ['鶏肉', 'カレー'] }),
        },
      );
    });

    it('API がエラーを返した場合、例外をスローするべき', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      await expect(api.evaluateRecipe({})).rejects.toThrow('Evaluate API error: 400');
    });

    it('レスポンスを正常に返すべき', async () => {
      const mockResponse = { score: 85, confidence: 0.9 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.evaluateRecipe({ ingredients: ['鶏肉'] });

      expect(result).toEqual(mockResponse);
    });
  });
});
