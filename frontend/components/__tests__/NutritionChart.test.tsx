import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NutritionChart } from '../NutritionChart';
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

describe('NutritionChart', () => {
  const mockSetNutrition = jest.fn();
  const mockOnValueChange = jest.fn();

  const mockNutritionState = {
    high_fat: 50,
    high_protein: 50,
    high_carb: 50,
    fiber_rich: 50,
    vitamin_rich: 50,
    low_calorie: 50,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSearchStore as jest.Mock).mockImplementation((selector) => {
      const state = {
        nutrition: mockNutritionState,
        setNutrition: mockSetNutrition,
      };
      return selector(state);
    });
  });

  describe('初期表示', () => {
    it('栄養6軸すべてが表示されるべき', () => {
      render(<NutritionChart onValueChange={mockOnValueChange} />);

      expect(screen.getByText('高脂肪')).toBeInTheDocument();
      expect(screen.getByText('高タンパク')).toBeInTheDocument();
      expect(screen.getByText('高炭水化物')).toBeInTheDocument();
      expect(screen.getByText('食物繊維豊富')).toBeInTheDocument();
      expect(screen.getByText('ビタミン豊富')).toBeInTheDocument();
      expect(screen.getByText('低カロリー')).toBeInTheDocument();
    });

    it('各スライダーの初期値が50であるべき', () => {
      render(<NutritionChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      expect(sliders).toHaveLength(6);
      sliders.forEach((slider) => {
        expect(slider).toHaveAttribute('value', '50');
      });
    });

    it('chart-container クラスが存在するべき', () => {
      const { container } = render(<NutritionChart onValueChange={mockOnValueChange} />);
      expect(container.querySelector('.chart-container')).toBeInTheDocument();
    });
  });

  describe('スライダー操作', () => {
    it('高タンパクスライダーを変更すると setNutrition が呼ばれるべき', () => {
      render(<NutritionChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[1], { target: { value: '80' } });

      expect(mockSetNutrition).toHaveBeenCalledWith({
        high_fat: 50,
        high_protein: 80,
        high_carb: 50,
        fiber_rich: 50,
        vitamin_rich: 50,
        low_calorie: 50,
      });
    });

    it('低カロリースライダーを変更すると setNutrition が呼ばれるべき', () => {
      render(<NutritionChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[5], { target: { value: '30' } });

      expect(mockSetNutrition).toHaveBeenCalledWith({
        high_fat: 50,
        high_protein: 50,
        high_carb: 50,
        fiber_rich: 50,
        vitamin_rich: 50,
        low_calorie: 30,
      });
    });

    it('onValueChange コールバックが新しい値で呼ばれるべき', () => {
      render(<NutritionChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '70' } });

      expect(mockOnValueChange).toHaveBeenCalledWith({
        high_fat: 70,
        high_protein: 50,
        high_carb: 50,
        fiber_rich: 50,
        vitamin_rich: 50,
        low_calorie: 50,
      });
    });
  });

  describe('境界値テスト', () => {
    it('最小値 (0) を設定できるべき', () => {
      render(<NutritionChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '0' } });

      expect(mockSetNutrition).toHaveBeenCalledWith({
        high_fat: 0,
        high_protein: 50,
        high_carb: 50,
        fiber_rich: 50,
        vitamin_rich: 50,
        low_calorie: 50,
      });
    });

    it('最大値 (100) を設定できるべき', () => {
      render(<NutritionChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      fireEvent.change(sliders[0], { target: { value: '100' } });

      expect(mockSetNutrition).toHaveBeenCalledWith({
        high_fat: 100,
        high_protein: 50,
        high_carb: 50,
        fiber_rich: 50,
        vitamin_rich: 50,
        low_calorie: 50,
      });
    });

    it('すべてのスライダーが 0-100 の範囲であるべき', () => {
      render(<NutritionChart onValueChange={mockOnValueChange} />);

      const sliders = screen.getAllByRole('slider');
      sliders.forEach((slider) => {
        expect(slider).toHaveAttribute('min', '0');
        expect(slider).toHaveAttribute('max', '100');
      });
    });
  });
});
