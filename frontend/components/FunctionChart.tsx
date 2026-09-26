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

interface FunctionChartProps {
  onValueChange?: (func: ReturnType<typeof useSearchStore.getState>['function']) => void;
}

const FUNCTION_ATTRIBUTES = [
  { key: 'thickener', label: 'とろみ剤' },
  { key: 'sweetener', label: '甘味料' },
  { key: 'souring_agent', label: '酸味料' },
  { key: 'umami_booster', label: 'うまみ強化' },
  { key: 'aromatic_base', label: '香りの基盤' },
  { key: 'fat_source', label: '脂質源' },
];

export function FunctionChart({ onValueChange }: FunctionChartProps) {
  const func = useSearchStore((s) => s.function);
  const setFunction = useSearchStore((s) => s.setFunction);

  const data = FUNCTION_ATTRIBUTES.map((attr) => ({
    attribute: attr.label,
    value: func[attr.key as keyof typeof func],
    fullMark: 100,
  }));

  const handleSliderChange = (key: keyof typeof func) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    const newFunc = { ...func, [key]: newValue };
    setFunction(newFunc);
    onValueChange?.(newFunc);
  };

  return (
    <div className="function-chart">
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
              name="機能"
              dataKey="value"
              stroke="#ffc658"
              fill="#ffc658"
              fillOpacity={0.6}
            />
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>

      <div className="slider-grid">
        {FUNCTION_ATTRIBUTES.map((attr) => (
          <div key={attr.key} className="slider-item">
            <label className="slider-label">
              <span className="slider-name">{attr.label}</span>
              <span className="slider-value">{func[attr.key as keyof typeof func]}</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={func[attr.key as keyof typeof func]}
              onChange={handleSliderChange(attr.key as keyof typeof func)}
              className="slider-input"
              style={{ accentColor: '#ffc658' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
