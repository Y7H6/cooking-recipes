import { useSearchStore } from '../search-store';

describe('search-store', () => {
  beforeEach(() => {
    // テストアイソレーションのためストアをリセット
    useSearchStore.getState().resetAll();
  });

  describe('初期値', () => {
    it('activeTab が taste であるべき', () => {
      const state = useSearchStore.getState();
      expect(state.activeTab).toBe('taste');
    });

    it('chartTab が taste であるべき', () => {
      const state = useSearchStore.getState();
      expect(state.chartTab).toBe('taste');
    });

    describe('taste 初期値', () => {
      it('sweet が 50 であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.taste.sweet).toBe(50);
      });

      it('salty が 50 であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.taste.salty).toBe(50);
      });

      it('bitter が 50 であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.taste.bitter).toBe(50);
      });

      it('spicy が 50 であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.taste.spicy).toBe(50);
      });

      it('umami が 50 であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.taste.umami).toBe(50);
      });

      it('overall が 50 であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.taste.overall).toBe(50);
      });
    });

    describe('aroma 初期値', () => {
      it('intensity が 50 であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.aroma.intensity).toBe(50);
      });

      it('family が null であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.aroma.family).toBeNull();
      });
    });

    describe('texture 初期値', () => {
      it('intensity が 50 であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.texture.intensity).toBe(50);
      });

      it('profile が null であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.texture.profile).toBeNull();
      });
    });

    describe('function 初期値', () => {
      it('thickener が 50 であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.function.thickener).toBe(50);
      });

      it('sweetener が 50 であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.function.sweetener).toBe(50);
      });

      it('souring_agent が 50 であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.function.souring_agent).toBe(50);
      });

      it('umami_booster が 50 であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.function.umami_booster).toBe(50);
      });

      it('aromatic_base が 50 であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.function.aromatic_base).toBe(50);
      });

      it('fat_source が 50 であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.function.fat_source).toBe(50);
      });
    });

    describe('nutrition 初期値', () => {
      it('high_fat が 50 であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.nutrition.high_fat).toBe(50);
      });

      it('high_protein が 50 であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.nutrition.high_protein).toBe(50);
      });

      it('high_carb が 50 であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.nutrition.high_carb).toBe(50);
      });

      it('fiber_rich が 50 であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.nutrition.fiber_rich).toBe(50);
      });

      it('vitamin_rich が 50 であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.nutrition.vitamin_rich).toBe(50);
      });

      it('low_calorie が 50 であるべき', () => {
        const state = useSearchStore.getState();
        expect(state.nutrition.low_calorie).toBe(50);
      });
    });

    it('sortBy が overall であるべき', () => {
      const state = useSearchStore.getState();
      expect(state.sortBy).toBe('overall');
    });

    it('sortOrder が desc であるべき', () => {
      const state = useSearchStore.getState();
      expect(state.sortOrder).toBe('desc');
    });

    it('filters が空オブジェクトであるべき', () => {
      const state = useSearchStore.getState();
      expect(state.filters).toEqual({});
    });
  });

  describe('setTaste アクション', () => {
    it('taste を更新できるべき', () => {
      const { setTaste } = useSearchStore.getState();
      setTaste({ sweet: 70, salty: 30, bitter: 20, spicy: 80, umami: 90, overall: 75 });

      const state = useSearchStore.getState();
      expect(state.taste.sweet).toBe(70);
      expect(state.taste.salty).toBe(30);
      expect(state.taste.bitter).toBe(20);
      expect(state.taste.spicy).toBe(80);
      expect(state.taste.umami).toBe(90);
      expect(state.taste.overall).toBe(75);
    });

    it('既存の taste 値を上書きするべき', () => {
      const { setTaste } = useSearchStore.getState();
      setTaste({ sweet: 80, salty: 50, bitter: 50, spicy: 50, umami: 50, overall: 50 });

      const state = useSearchStore.getState();
      expect(state.taste.sweet).toBe(80);
    });
  });

  describe('setAroma アクション', () => {
    it('aroma を更新できるべき', () => {
      const { setAroma } = useSearchStore.getState();
      setAroma({ intensity: 70, family: 'herb' });

      const state = useSearchStore.getState();
      expect(state.aroma.intensity).toBe(70);
      expect(state.aroma.family).toBe('herb');
    });

    it('aroma.family に null を設定できるべき', () => {
      const { setAroma } = useSearchStore.getState();
      setAroma({ intensity: 50, family: null });

      const state = useSearchStore.getState();
      expect(state.aroma.family).toBeNull();
    });
  });

  describe('setTexture アクション', () => {
    it('texture を更新できるべき', () => {
      const { setTexture } = useSearchStore.getState();
      setTexture({ intensity: 60, profile: 'crunchy' });

      const state = useSearchStore.getState();
      expect(state.texture.intensity).toBe(60);
      expect(state.texture.profile).toBe('crunchy');
    });

    it('texture.profile に null を設定できるべき', () => {
      const { setTexture } = useSearchStore.getState();
      setTexture({ intensity: 50, profile: null });

      const state = useSearchStore.getState();
      expect(state.texture.profile).toBeNull();
    });
  });

  describe('setFunction アクション', () => {
    it('function を更新できるべき', () => {
      const { setFunction } = useSearchStore.getState();
      setFunction({ thickener: 80, sweetener: 30, souring_agent: 50, umami_booster: 90, aromatic_base: 60, fat_source: 40 });

      const state = useSearchStore.getState();
      expect(state.function.thickener).toBe(80);
      expect(state.function.sweetener).toBe(30);
      expect(state.function.souring_agent).toBe(50);
      expect(state.function.umami_booster).toBe(90);
      expect(state.function.aromatic_base).toBe(60);
      expect(state.function.fat_source).toBe(40);
    });
  });

  describe('setNutrition アクション', () => {
    it('nutrition を更新できるべき', () => {
      const { setNutrition } = useSearchStore.getState();
      setNutrition({ high_fat: 80, high_protein: 90, high_carb: 30, fiber_rich: 50, vitamin_rich: 70, low_calorie: 20 });

      const state = useSearchStore.getState();
      expect(state.nutrition.high_fat).toBe(80);
      expect(state.nutrition.high_protein).toBe(90);
      expect(state.nutrition.high_carb).toBe(30);
      expect(state.nutrition.fiber_rich).toBe(50);
      expect(state.nutrition.vitamin_rich).toBe(70);
      expect(state.nutrition.low_calorie).toBe(20);
    });
  });

  describe('setChartTab アクション', () => {
    it('chartTab を taste に設定できるべき', () => {
      const { setChartTab } = useSearchStore.getState();
      setChartTab('taste');

      const state = useSearchStore.getState();
      expect(state.chartTab).toBe('taste');
    });

    it('chartTab を aroma に設定できるべき', () => {
      const { setChartTab } = useSearchStore.getState();
      setChartTab('aroma');

      const state = useSearchStore.getState();
      expect(state.chartTab).toBe('aroma');
    });

    it('chartTab を texture に設定できるべき', () => {
      const { setChartTab } = useSearchStore.getState();
      setChartTab('texture');

      const state = useSearchStore.getState();
      expect(state.chartTab).toBe('texture');
    });

    it('chartTab を function に設定できるべき', () => {
      const { setChartTab } = useSearchStore.getState();
      setChartTab('function');

      const state = useSearchStore.getState();
      expect(state.chartTab).toBe('function');
    });

    it('chartTab を nutrition に設定できるべき', () => {
      const { setChartTab } = useSearchStore.getState();
      setChartTab('nutrition');

      const state = useSearchStore.getState();
      expect(state.chartTab).toBe('nutrition');
    });
  });

  describe('setActiveTab アクション', () => {
    it('activeTab を search に設定できるべき', () => {
      const { setActiveTab } = useSearchStore.getState();
      setActiveTab('search');

      const state = useSearchStore.getState();
      expect(state.activeTab).toBe('search');
    });

    it('activeTab を genre に設定できるべき', () => {
      const { setActiveTab } = useSearchStore.getState();
      setActiveTab('genre');

      const state = useSearchStore.getState();
      expect(state.activeTab).toBe('genre');
    });
  });

  describe('setSortBy アクション', () => {
    it('sortBy を更新できるべき', () => {
      const { setSortBy } = useSearchStore.getState();
      setSortBy('sweet');

      const state = useSearchStore.getState();
      expect(state.sortBy).toBe('sweet');
    });

    it('sortBy を umami に設定できるべき', () => {
      const { setSortBy } = useSearchStore.getState();
      setSortBy('umami');

      const state = useSearchStore.getState();
      expect(state.sortBy).toBe('umami');
    });
  });

  describe('setSortOrder アクション', () => {
    it('sortOrder を desc に設定できるべき', () => {
      const { setSortOrder } = useSearchStore.getState();
      setSortOrder('desc');

      const state = useSearchStore.getState();
      expect(state.sortOrder).toBe('desc');
    });

    it('sortOrder を asc に設定できるべき', () => {
      const { setSortOrder } = useSearchStore.getState();
      setSortOrder('asc');

      const state = useSearchStore.getState();
      expect(state.sortOrder).toBe('asc');
    });
  });

  describe('setFilters アクション', () => {
    it('filters に genre を設定できるべき', () => {
      const { setFilters } = useSearchStore.getState();
      setFilters({ genre: 'japanese' });

      const state = useSearchStore.getState();
      expect(state.filters.genre).toBe('japanese');
    });

    it('filters に複数の条件を設定できるべき', () => {
      const { setFilters } = useSearchStore.getState();
      setFilters({ genre: 'japanese', aroma_family: 'herb', min_confidence: 0.5, favorite_only: true });

      const state = useSearchStore.getState();
      expect(state.filters.genre).toBe('japanese');
      expect(state.filters.aroma_family).toBe('herb');
      expect(state.filters.min_confidence).toBe(0.5);
      expect(state.filters.favorite_only).toBe(true);
    });

    it('filters を更新できるべき', () => {
      const { setFilters } = useSearchStore.getState();
      setFilters({ genre: 'japanese' });
      setFilters({ genre: 'chinese' });

      const state = useSearchStore.getState();
      expect(state.filters.genre).toBe('chinese');
    });
  });

  describe('resetAll アクション', () => {
    it('すべての状態が初期値にリセットされるべき', () => {
      // 状態を変更
      const { setTaste, setAroma, setTexture, setFunction, setNutrition, setChartTab, setActiveTab, setSortBy, setSortOrder, setFilters } = useSearchStore.getState();

      setTaste({ sweet: 80, salty: 20, bitter: 10, spicy: 90, umami: 70, overall: 60 });
      setAroma({ intensity: 70, family: 'spice' });
      setTexture({ intensity: 60, profile: 'crunchy' });
      setFunction({ thickener: 90, sweetener: 30, souring_agent: 50, umami_booster: 80, aromatic_base: 70, fat_source: 40 });
      setNutrition({ high_fat: 80, high_protein: 90, high_carb: 30, fiber_rich: 50, vitamin_rich: 70, low_calorie: 20 });
      setChartTab('aroma');
      setActiveTab('genre');
      setSortBy('sweet');
      setSortOrder('asc');
      setFilters({ genre: 'japanese', favorite_only: true });

      // リセット
      useSearchStore.getState().resetAll();

      const state = useSearchStore.getState();

      expect(state.activeTab).toBe('taste');
      expect(state.chartTab).toBe('taste');
      expect(state.taste.sweet).toBe(50);
      expect(state.taste.salty).toBe(50);
      expect(state.taste.bitter).toBe(50);
      expect(state.taste.spicy).toBe(50);
      expect(state.taste.umami).toBe(50);
      expect(state.taste.overall).toBe(50);
      expect(state.aroma.intensity).toBe(50);
      expect(state.aroma.family).toBeNull();
      expect(state.texture.intensity).toBe(50);
      expect(state.texture.profile).toBeNull();
      expect(state.function.thickener).toBe(50);
      expect(state.function.sweetener).toBe(50);
      expect(state.function.souring_agent).toBe(50);
      expect(state.function.umami_booster).toBe(50);
      expect(state.function.aromatic_base).toBe(50);
      expect(state.function.fat_source).toBe(50);
      expect(state.nutrition.high_fat).toBe(50);
      expect(state.nutrition.high_protein).toBe(50);
      expect(state.nutrition.high_carb).toBe(50);
      expect(state.nutrition.fiber_rich).toBe(50);
      expect(state.nutrition.vitamin_rich).toBe(50);
      expect(state.nutrition.low_calorie).toBe(50);
      expect(state.sortBy).toBe('overall');
      expect(state.sortOrder).toBe('desc');
      expect(state.filters).toEqual({});
    });
  });

  describe('状態の独立性', () => {
    it('複数のアクションを連続で実行できるべき', () => {
      const { setTaste, setAroma, setChartTab } = useSearchStore.getState();

      setTaste({ sweet: 70, salty: 30, bitter: 50, spicy: 50, umami: 50, overall: 50 });
      setAroma({ intensity: 60, family: 'herb' });
      setChartTab('aroma');

      const state = useSearchStore.getState();
      expect(state.taste.sweet).toBe(70);
      expect(state.aroma.intensity).toBe(60);
      expect(state.chartTab).toBe('aroma');
    });
  });
});
