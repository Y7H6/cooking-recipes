'use client';

import React from 'react';
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { useSearchStore } from '../store/search-store';

interface TasteChartProps {
  onValueChange?: (taste: ReturnType<typeof useSearchStore.getState>['taste']) => void;
}

const TASTE_ATTRIBUTES = [
  { key: 'sweet', label: '甘さ', color: '#FF6B6B' },
  { key: 'salty', label: '塩気', color: '#4ECDC4' },
  { key: 'bitter', label: '苦み', color: '#95E1D3' },
  { key: 'spicy', label: '辛味', color: '#F38181' },
  { key: 'umami', label: 'うまみ', color: '#AA96DA' },
  { key: 'overall', label: '総合', color: '#FCBAD3' },
];

export function TasteChart({ onValueChange }: TasteChartProps) {
  const taste = useSearchStore((s) => s.taste);
  const setTaste = useSearchStore((s) => s.setTaste);

  const data = TASTE_ATTRIBUTES.map((attr) => ({
    attribute: attr.label,
    value: taste[attr.key as keyof typeof taste],
    fullMark: 100,
  }));

  const handleSliderChange = (key: keyof typeof taste) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    const newTaste = { ...taste, [key]: newValue };
    setTaste(newTaste);
    onValueChange?.(newTaste);
  };

  return (
    <div className="taste-chart">
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={350}>
          <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid />
            <PolarAngleAxis
              dataKey="attribute"
              tick={{ fill: '#333', fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
            />
            <Radar
              name="味覚"
              dataKey="value"
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.6}
            />
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>

      <div className="slider-grid">
        {TASTE_ATTRIBUTES.map((attr) => (
          <div key={attr.key} className="slider-item">
            <label className="slider-label">
              <span className="slider-name">{attr.label}</span>
              <span className="slider-value">{taste[attr.key as keyof typeof taste]}</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={taste[attr.key as keyof typeof taste]}
              onChange={handleSliderChange(attr.key as keyof typeof taste)}
              className="slider-input"
              style={{ accentColor: attr.color }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
