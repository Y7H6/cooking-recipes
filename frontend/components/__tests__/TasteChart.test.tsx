import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TasteChart } from '../TasteChart';
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

describe('TasteChart', () => {
  const mockSetTaste = jest.fn();
  const mockOnValueChange = jest.fn();

  const mockTasteState = {
    sweet: 50,
    salty: 50,
    bitter: 50,
    spicy: 50,
    umami: 50,
    overall: 50,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSearchStore as jest.Mock).mockImplementation((selector) => {
      const state = {
        taste: mockTasteState,
        setTaste: mockSetTaste,
      };
      return selector(state);
    });
  });

  describe('初期表示', () => {
    it('スライダーが6軸すべて表示されるべき', () => {
      render(<TasteChart onValueChange={mockOnValueChange} />);

      expect(screen.getByText('甘さ')).toBeInTheDocument();
      expect(screen.getByText('塩気')).toBeInTheDocument();
      expect(screen.getByText('苦み')).toBeInTheDocument();
      expect(screen.getByText('辛味')).toBeInTheDocument();
      expect(screen.getByText('うまみ')).toBeInTheDocument();
    });

    it('各スライダーの初期値が50であるべき', () => {
      render(<TasteChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      expect(sliders).toHaveLength(6);
      sliders.forEach((slider) => {
        expect(slider).toHaveAttribute('value', '50');
      });
    });

    it('スライダー値の表示が存在するべき', () => {
      render(<TasteChart onValueChange={mockOnValueChange} />);

      const values = screen.getAllByText('50');
      expect(values.length).toBeGreaterThan(0);
    });

    it('チャートコンテナが存在するべき', () => {
      const { container } = render(<TasteChart onValueChange={mockOnValueChange} />);
      expect(container.querySelector('.chart-container')).toBeInTheDocument();
    });

    it('slider-grid クラスが存在するべき', () => {
      const { container } = render(<TasteChart onValueChange={mockOnValueChange} />);
      expect(container.querySelector('.slider-grid')).toBeInTheDocument();
    });
  });

  describe('スライダー操作', () => {
    it('甘さスライダーを変更すると setTaste が呼ばれるべき', async () => {
      render(<TasteChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      await act(async () => {
        fireEvent.change(sliders[0], { target: { value: '70' } });
      });

      expect(mockSetTaste).toHaveBeenCalledWith({
        sweet: 70,
        salty: 50,
        bitter: 50,
        spicy: 50,
        umami: 50,
        overall: 50,
      });
    });

    it('うま味スライダーを変更すると setTaste が呼ばれるべき', async () => {
      render(<TasteChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      await act(async () => {
        fireEvent.change(sliders[4], { target: { value: '80' } });
      });

      expect(mockSetTaste).toHaveBeenCalledWith({
        sweet: 50,
        salty: 50,
        bitter: 50,
        spicy: 50,
        umami: 80,
        overall: 50,
      });
    });

    it('スライダー値が0でも正常に動作するべき', async () => {
      render(<TasteChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      await act(async () => {
        fireEvent.change(sliders[0], { target: { value: '0' } });
      });

      expect(mockSetTaste).toHaveBeenCalledWith({
        sweet: 0,
        salty: 50,
        bitter: 50,
        spicy: 50,
        umami: 50,
        overall: 50,
      });
    });

    it('スライダー値が100でも正常に動作するべき', async () => {
      render(<TasteChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      await act(async () => {
        fireEvent.change(sliders[0], { target: { value: '100' } });
      });

      expect(mockSetTaste).toHaveBeenCalledWith({
        sweet: 100,
        salty: 50,
        bitter: 50,
        spicy: 50,
        umami: 50,
        overall: 50,
      });
    });

    it('onValueChange コールバックが新しい値で呼ばれるべき', async () => {
      render(<TasteChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      await act(async () => {
        fireEvent.change(sliders[0], { target: { value: '60' } });
      });

      expect(mockOnValueChange).toHaveBeenCalledWith({
        sweet: 60,
        salty: 50,
        bitter: 50,
        spicy: 50,
        umami: 50,
        overall: 50,
      });
    });

    it('onValueChange が省略されてもエラーにならないべき', async () => {
      render(<TasteChart />);

      const sliders = screen.getAllByRole('slider');
      await act(async () => {
        fireEvent.change(sliders[0], { target: { value: '60' } });
      });

      // エラーが発生しないことを確認
      expect(mockSetTaste).toHaveBeenCalled();
    });
  });

  describe('境界値テスト', () => {
    it('最小値 (0) を設定できるべき', () => {
      render(<TasteChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      sliders.forEach((slider) => {
        expect(slider).toHaveAttribute('min', '0');
        expect(slider).toHaveAttribute('max', '100');
      });
    });

    it('最大値 (100) を設定できるべき', () => {
      render(<TasteChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      sliders.forEach((slider) => {
        expect(slider).toHaveAttribute('max', '100');
      });
    });
  });

  describe('チャート描画', () => {
    it('ResponsiveContainer が存在するべき', () => {
      const { container } = render(<TasteChart onValueChange={mockOnValueChange} />);
      // ResponsiveContainer はモックされているため、クラス名で確認
      expect(container.querySelector('.taste-chart')).toBeInTheDocument();
    });

    it('チャートデータが正しく生成されるべき', () => {
      const customTaste = {
        sweet: 30,
        salty: 60,
        bitter: 20,
        spicy: 80,
        umami: 90,
        overall: 70,
      };

      (useSearchStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          taste: customTaste,
          setTaste: mockSetTaste,
        };
        return selector(state);
      });

      render(<TasteChart onValueChange={mockOnValueChange} />);

      // 値が表示されていることを確認
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('60')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('80')).toBeInTheDocument();
    });
  });
});
