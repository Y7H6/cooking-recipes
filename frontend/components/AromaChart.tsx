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

interface AromaChartProps {
  onValueChange?: (aroma: ReturnType<typeof useSearchStore.getState>['aroma']) => void;
}

const AROMA_DATA = [
  { name: '強度', value: 'intensity' },
  { name: '系統', value: 'family' },
];

export function AromaChart({ onValueChange }: AromaChartProps) {
  const aroma = useSearchStore((s) => s.aroma);
  const setAroma = useSearchStore((s) => s.setAroma);

  const chartData = [
    { name: '香りの強度', value: aroma.intensity, fill: '#8884d8' },
    { name: '系統有無', value: aroma.family ? 100 : 0, fill: '#82ca9d' },
  ];

  const handleIntensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    const newAroma = { ...aroma, intensity: newValue };
    setAroma(newAroma);
    onValueChange?.(newAroma);
  };

  const handleFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value || null;
    const newAroma = { ...aroma, family: newValue };
    setAroma(newAroma);
    onValueChange?.(newAroma);
  };

  return (
    <div className="aroma-chart">
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <RechartsBarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Bar dataKey="value" fill="#8884d8" />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>

      <div className="slider-grid">
        <div className="slider-item">
          <label className="slider-label">
            <span className="slider-name">香りの強度</span>
            <span className="slider-value">{aroma.intensity}</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={aroma.intensity}
            onChange={handleIntensityChange}
            className="slider-input"
            style={{ accentColor: '#8884d8' }}
          />
        </div>

        <div className="slider-item">
          <label className="slider-label">
            <span className="slider-name">香り系統</span>
          </label>
          <select
            value={aroma.family || ''}
            onChange={handleFamilyChange}
            className="slider-select"
          >
            <option value="">指定しない</option>
            <option value="citrus">柑橘系</option>
            <option value="floral">花系</option>
            <option value="herb">ハーブ系</option>
            <option value="spice">スパイス系</option>
            <option value="smoky">スモーキー系</option>
            <option value="fruity">果実系</option>
            <option value="earthy">土壌系</option>
          </select>
        </div>
      </div>
    </div>
  );
}
