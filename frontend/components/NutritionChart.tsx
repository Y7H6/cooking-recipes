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

interface NutritionChartProps {
  onValueChange?: (nutrition: ReturnType<typeof useSearchStore.getState>['nutrition']) => void;
}

const NUTRITION_ATTRIBUTES = [
  { key: 'high_fat', label: '高脂肪' },
  { key: 'high_protein', label: '高タンパク' },
  { key: 'high_carb', label: '高炭水化物' },
  { key: 'fiber_rich', label: '食物繊維豊富' },
  { key: 'vitamin_rich', label: 'ビタミン豊富' },
  { key: 'low_calorie', label: '低カロリー' },
];

export function NutritionChart({ onValueChange }: NutritionChartProps) {
  const nutrition = useSearchStore((s) => s.nutrition);
  const setNutrition = useSearchStore((s) => s.setNutrition);

  const data = NUTRITION_ATTRIBUTES.map((attr) => ({
    attribute: attr.label,
    value: nutrition[attr.key as keyof typeof nutrition],
    fullMark: 100,
  }));

  const handleSliderChange = (key: keyof typeof nutrition) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    const newNutrition = { ...nutrition, [key]: newValue };
    setNutrition(newNutrition);
    onValueChange?.(newNutrition);
  };

  return (
    <div className="nutrition-chart">
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
              name="栄養"
              dataKey="value"
              stroke="#82ca9d"
              fill="#82ca9d"
              fillOpacity={0.6}
            />
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>

      <div className="slider-grid">
        {NUTRITION_ATTRIBUTES.map((attr) => (
          <div key={attr.key} className="slider-item">
            <label className="slider-label">
              <span className="slider-name">{attr.label}</span>
              <span className="slider-value">{nutrition[attr.key as keyof typeof nutrition]}</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={nutrition[attr.key as keyof typeof nutrition]}
              onChange={handleSliderChange(attr.key as keyof typeof nutrition)}
              className="slider-input"
              style={{ accentColor: '#82ca9d' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
