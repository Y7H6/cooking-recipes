import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextureChart } from '../TextureChart';
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

describe('TextureChart', () => {
  const mockSetTexture = jest.fn();
  const mockOnValueChange = jest.fn();

  const mockTextureState = {
    intensity: 50,
    profile: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSearchStore as jest.Mock).mockImplementation((selector) => {
      const state = {
        texture: mockTextureState,
        setTexture: mockSetTexture,
      };
      return selector(state);
    });
  });

  describe('初期表示', () => {
    it('食感の強度スライダーが表示されるべき', () => {
      render(<TextureChart onValueChange={mockOnValueChange} />);

      expect(screen.getByText('食感の強度')).toBeInTheDocument();
    });

    it('食感系統セレクトボックスが表示されるべき', () => {
      render(<TextureChart onValueChange={mockOnValueChange} />);

      expect(screen.getByText('食感系統')).toBeInTheDocument();
    });

    it('スライダーの初期値が50であるべき', () => {
      render(<TextureChart onValueChange={mockOnValueChange} />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('value', '50');
    });

    it('セレクトボックスのデフォルトが「指定しない」であるべき', () => {
      render(<TextureChart onValueChange={mockOnValueChange} />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('');
    });
  });

  describe('強度スライダー操作', () => {
    it('強度スライダーを変更すると setTexture が呼ばれるべき', () => {
      render(<TextureChart onValueChange={mockOnValueChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '80' } });

      expect(mockSetTexture).toHaveBeenCalledWith({
        intensity: 80,
        profile: null,
      });
    });

    it('強度スライダーの最小値 (0) を設定できるべき', () => {
      render(<TextureChart onValueChange={mockOnValueChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '0' } });

      expect(mockSetTexture).toHaveBeenCalledWith({
        intensity: 0,
        profile: null,
      });
    });

    it('強度スライダーの最大値 (100) を設定できるべき', () => {
      render(<TextureChart onValueChange={mockOnValueChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '100' } });

      expect(mockSetTexture).toHaveBeenCalledWith({
        intensity: 100,
        profile: null,
      });
    });
  });

  describe('食感系統セレクト操作', () => {
    const textureProfiles = ['soft', 'crunchy', 'chewy', 'creamy', 'crispy', 'smooth', 'gelatinous', 'flaky'];

    it('すべての食感系統オプションが存在するべき', () => {
      render(<TextureChart onValueChange={mockOnValueChange} />);

      const select = screen.getByRole('combobox');
      textureProfiles.forEach((profile) => {
        const option = select.querySelector(`option[value="${profile}"]`);
        expect(option).toBeInTheDocument();
      });
    });

    it('crunchy を選択すると setTexture が呼ばれるべき', () => {
      render(<TextureChart onValueChange={mockOnValueChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'crunchy' } });

      expect(mockSetTexture).toHaveBeenCalledWith({
        intensity: 50,
        profile: 'crunchy',
      });
    });

    it('「指定しない」を選択すると profile が null になるべき', () => {
      render(<TextureChart onValueChange={mockOnValueChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '' } });

      expect(mockSetTexture).toHaveBeenCalledWith({
        intensity: 50,
        profile: null,
      });
    });

    it('onValueChange コールバックが新しい値で呼ばれるべき', () => {
      render(<TextureChart onValueChange={mockOnValueChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'creamy' } });

      expect(mockOnValueChange).toHaveBeenCalledWith({
        intensity: 50,
        profile: 'creamy',
      });
    });
  });

  describe('状態の整合性', () => {
    it('強度を変更しても profile は保持されるべき', () => {
      const textureWithProfile = { intensity: 50, profile: 'soft' };

      (useSearchStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          texture: textureWithProfile,
          setTexture: mockSetTexture,
        };
        return selector(state);
      });

      render(<TextureChart onValueChange={mockOnValueChange} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '30' } });

      expect(mockSetTexture).toHaveBeenCalledWith({
        intensity: 30,
        profile: 'soft',
      });
    });

    it('系統を変更しても intensity は保持されるべき', () => {
      const textureWithIntensity = { intensity: 60, profile: null };

      (useSearchStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          texture: textureWithIntensity,
          setTexture: mockSetTexture,
        };
        return selector(state);
      });

      render(<TextureChart onValueChange={mockOnValueChange} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'chewy' } });

      expect(mockSetTexture).toHaveBeenCalledWith({
        intensity: 60,
        profile: 'chewy',
      });
    });
  });
});
