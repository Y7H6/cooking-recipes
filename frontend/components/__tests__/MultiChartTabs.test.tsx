import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MultiChartTabs } from '../MultiChartTabs';
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

// チャートコンポーネントのモック
jest.mock('../TasteChart', () => ({ TasteChart: () => <div data-testid="taste-chart">味覚チャート</div> }));
jest.mock('../AromaChart', () => ({ AromaChart: () => <div data-testid="aroma-chart">香りチャート</div> }));
jest.mock('../TextureChart', () => ({ TextureChart: () => <div data-testid="texture-chart">食感チャート</div> }));
jest.mock('../FunctionChart', () => ({ FunctionChart: () => <div data-testid="function-chart">用途チャート</div> }));
jest.mock('../NutritionChart', () => ({ NutritionChart: () => <div data-testid="nutrition-chart">栄養チャート</div> }));

describe('MultiChartTabs', () => {
  const mockSetChartTab = jest.fn();
  const mockChartTab = 'taste';

  beforeEach(() => {
    jest.clearAllMocks();
    (useSearchStore as jest.Mock).mockImplementation((selector) => {
      const state = {
        chartTab: mockChartTab,
        setChartTab: mockSetChartTab,
      };
      return selector(state);
    });
  });

  describe('初期表示', () => {
    it('5つのタブボタンが表示されるべき', () => {
      render(<MultiChartTabs />);

      expect(screen.getByText('味覚')).toBeInTheDocument();
      expect(screen.getByText('香り')).toBeInTheDocument();
      expect(screen.getByText('食感')).toBeInTheDocument();
      expect(screen.getByText('用途')).toBeInTheDocument();
      expect(screen.getByText('栄養')).toBeInTheDocument();
    });

    it('デフォルトタブ（味覚）が active 状態であるべき', () => {
      render(<MultiChartTabs />);

      const tasteButton = screen.getByText('味覚').closest('button');
      expect(tasteButton).toHaveClass('active');
    });

    it('他のタブは active 状態でないべき', () => {
      render(<MultiChartTabs />);

      const aromaButton = screen.getByText('香り').closest('button');
      expect(aromaButton).not.toHaveClass('active');
    });

    it('デフォルトで味覚チャートが表示されるべき', () => {
      render(<MultiChartTabs />);

      expect(screen.getByTestId('taste-chart')).toBeInTheDocument();
    });
  });

  describe('タブ切り替え', () => {
    it('香りタブをクリックすると setChartTab が呼ばれるべき', () => {
      render(<MultiChartTabs />);

      fireEvent.click(screen.getByText('香り'));

      expect(mockSetChartTab).toHaveBeenCalledWith('aroma');
    });

    it('食感タブをクリックすると setChartTab が呼ばれるべき', () => {
      render(<MultiChartTabs />);

      fireEvent.click(screen.getByText('食感'));

      expect(mockSetChartTab).toHaveBeenCalledWith('texture');
    });

    it('用途タブをクリックすると setChartTab が呼ばれるべき', () => {
      render(<MultiChartTabs />);

      fireEvent.click(screen.getByText('用途'));

      expect(mockSetChartTab).toHaveBeenCalledWith('function');
    });

    it('栄養タブをクリックすると setChartTab が呼ばれるべき', () => {
      render(<MultiChartTabs />);

      fireEvent.click(screen.getByText('栄養'));

      expect(mockSetChartTab).toHaveBeenCalledWith('nutrition');
    });

    it('切り替え後に正しいチャートが表示されるべき', () => {
      const { rerender } = render(<MultiChartTabs />);

      // 香りタブをクリック
      fireEvent.click(screen.getByText('香り'));

      // state を更新して再描画
      (useSearchStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          chartTab: 'aroma',
          setChartTab: mockSetChartTab,
        };
        return selector(state);
      });
      rerender(<MultiChartTabs />);

      expect(screen.getByTestId('aroma-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('taste-chart')).not.toBeInTheDocument();
    });
  });

  describe('チャートコンテンツ', () => {
    it('chart-content クラスが存在するべき', () => {
      const { container } = render(<MultiChartTabs />);
      expect(container.querySelector('.chart-content')).toBeInTheDocument();
    });

    it('multi-chart-tabs クラスが存在するべき', () => {
      const { container } = render(<MultiChartTabs />);
      expect(container.querySelector('.multi-chart-tabs')).toBeInTheDocument();
    });

    it('chart-tab-buttons クラスが存在するべき', () => {
      const { container } = render(<MultiChartTabs />);
      expect(container.querySelector('.chart-tab-buttons')).toBeInTheDocument();
    });
  });
});
