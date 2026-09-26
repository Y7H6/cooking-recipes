import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AromaChart } from '../AromaChart';
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

describe('AromaChart', () => {
  const mockSetAroma = jest.fn();
  const mockOnValueChange = jest.fn();

  const mockAromaState = {
    intensity: 50,
    family: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSearchStore as jest.Mock).mockImplementation((selector) => {
      const state = {
        aroma: mockAromaState,
        setAroma: mockSetAroma,
      };
      return selector(state);
    });
  });

  describe('初期表示', () => {
    it('香りの強度スライダーが表示されるべき', () => {
      render(<AromaChart onValueChange={mockOnValueChange} />);

      expect(screen.getByText('香りの強度')).toBeInTheDocument();
    });

    it('香り系統セレクトボックスが表示されるべき', () => {
      render(<AromaChart onValueChange={mockOnValueChange} />);

      expect(screen.getByText('香り系統')).toBeInTheDocument();
    });

    it('スライダーの初期値が50であるべき', () => {
      render(<AromaChart onValueChange={mockOnValueChange} />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('value', '50');
    });

    it('セレクトボックスのデフォルトが「指定しない」であるべき', () => {
      render(<AromaChart onValueChange={mockOnValueChange} />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('');
    });

    it('チャートコンテナが存在するべき', () => {
      const { container } = render(<AromaChart onValueChange={mockOnValueChange} />);
      expect(container.querySelector('.chart-container')).toBeInTheDocument();
    });
  });

  describe('強度スライダー操作', () => {
    it('強度スライダーを変更すると setAroma が呼ばれるべき', () => {
      render(<AromaChart onValueChange={mockOnValueChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '75' } });

      expect(mockSetAroma).toHaveBeenCalledWith({
        intensity: 75,
        family: null,
      });
    });

    it('強度スライダーの最小値 (0) を設定できるべき', () => {
      render(<AromaChart onValueChange={mockOnValueChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '0' } });

      expect(mockSetAroma).toHaveBeenCalledWith({
        intensity: 0,
        family: null,
      });
    });

    it('強度スライダーの最大値 (100) を設定できるべき', () => {
      render(<AromaChart onValueChange={mockOnValueChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '100' } });

      expect(mockSetAroma).toHaveBeenCalledWith({
        intensity: 100,
        family: null,
      });
    });

    it('強度値が数値として処理されるべき', () => {
      render(<AromaChart onValueChange={mockOnValueChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '33' } });

      expect(mockSetAroma).toHaveBeenCalledWith({
        intensity: 33,
        family: null,
      });
    });
  });

  describe('香り系統セレクト操作', () => {
    const aromaFamilies = ['citrus', 'floral', 'herb', 'spice', 'smoky', 'fruity', 'earthy'];

    it('すべての香り系統オプションが存在するべき', () => {
      render(<AromaChart onValueChange={mockOnValueChange} />);

      const select = screen.getByRole('combobox');
      aromaFamilies.forEach((family) => {
        const option = select.querySelector(`option[value="${family}"]`);
        expect(option).toBeInTheDocument();
      });
    });

    it('柑橘系を選択すると setAroma が呼ばれるべき', () => {
      render(<AromaChart onValueChange={mockOnValueChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'citrus' } });

      expect(mockSetAroma).toHaveBeenCalledWith({
        intensity: 50,
        family: 'citrus',
      });
    });

    it('スパイス系を選択すると setAroma が呼ばれるべき', () => {
      render(<AromaChart onValueChange={mockOnValueChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'spice' } });

      expect(mockSetAroma).toHaveBeenCalledWith({
        intensity: 50,
        family: 'spice',
      });
    });

    it('「指定しない」を選択すると family が null になるべき', () => {
      render(<AromaChart onValueChange={mockOnValueChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '' } });

      expect(mockSetAroma).toHaveBeenCalledWith({
        intensity: 50,
        family: null,
      });
    });

    it('onValueChange コールバックが新しい値で呼ばれるべき', () => {
      render(<AromaChart onValueChange={mockOnValueChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'herb' } });

      expect(mockOnValueChange).toHaveBeenCalledWith({
        intensity: 50,
        family: 'herb',
      });
    });
  });

  describe('状態の整合性', () => {
    it('強度を変更しても family は保持されるべき', () => {
      const aromaWithFamily = { intensity: 50, family: 'floral' };

      (useSearchStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          aroma: aromaWithFamily,
          setAroma: mockSetAroma,
        };
        return selector(state);
      });

      render(<AromaChart onValueChange={mockOnValueChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '40' } });

      expect(mockSetAroma).toHaveBeenCalledWith({
        intensity: 40,
        family: 'floral',
      });
    });

    it('系統を変更しても intensity は保持されるべき', () => {
      const aromaWithIntensity = { intensity: 70, family: null };

      (useSearchStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          aroma: aromaWithIntensity,
          setAroma: mockSetAroma,
        };
        return selector(state);
      });

      render(<AromaChart onValueChange={mockOnValueChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'smoky' } });

      expect(mockSetAroma).toHaveBeenCalledWith({
        intensity: 70,
        family: 'smoky',
      });
    });
  });
});
