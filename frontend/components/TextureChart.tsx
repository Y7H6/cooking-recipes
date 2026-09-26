'use client';

import React from 'react';
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts';
import { useSearchStore } from '../store/search-store';

interface TextureChartProps {
  onValueChange?: (texture: ReturnType<typeof useSearchStore.getState>['texture']) => void;
}

const TEXTURE_PROFILES = [
  'soft', 'crunchy', 'chewy', 'creamy', 'crispy', 'smooth', 'gelatinous', 'flaky'
];

export function TextureChart({ onValueChange }: TextureChartProps) {
  const texture = useSearchStore((s) => s.texture);
  const setTexture = useSearchStore((s) => s.setTexture);

  const chartData = [
    { name: '食感の強度', value: texture.intensity, fill: '#ffc658' },
    { name: '系統有無', value: texture.profile ? 100 : 0, fill: '#82ca9d' },
  ];

  const handleIntensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    const newTexture = { ...texture, intensity: newValue };
    setTexture(newTexture);
    onValueChange?.(newTexture);
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value || null;
    const newTexture = { ...texture, profile: newValue };
    setTexture(newTexture);
    onValueChange?.(newTexture);
  };

  return (
    <div className="texture-chart">
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <RechartsBarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Bar dataKey="value" fill="#ffc658" />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>

      <div className="slider-grid">
        <div className="slider-item">
          <label className="slider-label">
            <span className="slider-name">食感の強度</span>
            <span className="slider-value">{texture.intensity}</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={texture.intensity}
            onChange={handleIntensityChange}
            className="slider-input"
            style={{ accentColor: '#ffc658' }}
          />
        </div>

        <div className="slider-item">
          <label className="slider-label">
            <span className="slider-name">食感系統</span>
          </label>
          <select
            value={texture.profile || ''}
            onChange={handleProfileChange}
            className="slider-select"
          >
            <option value="">指定しない</option>
            {TEXTURE_PROFILES.map((profile) => (
              <option key={profile} value={profile}>
                {profile}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
