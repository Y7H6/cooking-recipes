import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FunctionChart } from '../FunctionChart';
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

describe('FunctionChart', () => {
  const mockSetFunction = jest.fn();
  const mockOnValueChange = jest.fn();

  const mockFunctionState = {
    thickener: 50,
    sweetener: 50,
    souring_agent: 50,
    umami_booster: 50,
    aromatic_base: 50,
    fat_source: 50,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSearchStore as jest.Mock).mockImplementation((selector) => {
      const state = {
        function: mockFunctionState,
        setFunction: mockSetFunction,
      };
      return selector(state);
    });
  });

  describe('初期表示', () => {
    it('用途6軸すべてが表示されるべき', () => {
      render(<FunctionChart onValueChange={mockOnValueChange} />);

      expect(screen.getByText('とろみ剤')).toBeInTheDocument();
      expect(screen.getByText('甘味料')).toBeInTheDocument();
      expect(screen.getByText('酸味料')).toBeInTheDocument();
      expect(screen.getByText('うまみ強化')).toBeInTheDocument();
      expect(screen.getByText('香りの基盤')).toBeInTheDocument();
      expect(screen.getByText('脂質源')).toBeInTheDocument();
    });

    it('各スライダーの初期値が50であるべき', () => {
      render(<FunctionChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      expect(sliders).toHaveLength(6);
      sliders.forEach((slider) => {
        expect(slider).toHaveAttribute('value', '50');
      });
    });

    it('chart-container クラスが存在するべき', () => {
      const { container } = render(<FunctionChart onValueChange={mockOnValueChange} />);
      expect(container.querySelector('.chart-container')).toBeInTheDocument();
    });
  });

  describe('スライダー操作', () => {
    it('とろみ付けスライダーを変更すると setFunction が呼ばれるべき', () => {
      render(<FunctionChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '70' } });

      expect(mockSetFunction).toHaveBeenCalledWith({
        thickener: 70,
        sweetener: 50,
        souring_agent: 50,
        umami_booster: 50,
        aromatic_base: 50,
        fat_source: 50,
      });
    });

    it('うまみ強化スライダーを変更すると setFunction が呼ばれるべき', () => {
      render(<FunctionChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[3], { target: { value: '90' } });

      expect(mockSetFunction).toHaveBeenCalledWith({
        thickener: 50,
        sweetener: 50,
        souring_agent: 50,
        umami_booster: 90,
        aromatic_base: 50,
        fat_source: 50,
      });
    });

    it('脂質源スライダーを変更すると setFunction が呼ばれるべき', () => {
      render(<FunctionChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[5], { target: { value: '30' } });

      expect(mockSetFunction).toHaveBeenCalledWith({
        thickener: 50,
        sweetener: 50,
        souring_agent: 50,
        umami_booster: 50,
        aromatic_base: 50,
        fat_source: 30,
      });
    });

    it('onValueChange コールバックが新しい値で呼ばれるべき', () => {
      render(<FunctionChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '60' } });

      expect(mockOnValueChange).toHaveBeenCalledWith({
        thickener: 60,
        sweetener: 50,
        souring_agent: 50,
        umami_booster: 50,
        aromatic_base: 50,
        fat_source: 50,
      });
    });
  });

  describe('境界値テスト', () => {
    it('最小値 (0) を設定できるべき', () => {
      render(<FunctionChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '0' } });

      expect(mockSetFunction).toHaveBeenCalledWith({
        thickener: 0,
        sweetener: 50,
        souring_agent: 50,
        umami_booster: 50,
        aromatic_base: 50,
        fat_source: 50,
      });
    });

    it('最大値 (100) を設定できるべき', () => {
      render(<FunctionChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '100' } });

      expect(mockSetFunction).toHaveBeenCalledWith({
        thickener: 100,
        sweetener: 50,
        souring_agent: 50,
        umami_booster: 50,
        aromatic_base: 50,
        fat_source: 50,
      });
    });

    it('すべてのスライダーが 0-100 の範囲であるべき', () => {
      render(<FunctionChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      sliders.forEach((slider) => {
        expect(slider).toHaveAttribute('min', '0');
        expect(slider).toHaveAttribute('max', '100');
      });
    });
  });
});
