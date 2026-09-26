'use client';

import React from 'react';
import { useSearchStore } from '../store/search-store';
import { ChartTab } from '../lib/types';
import { TasteChart } from './TasteChart';
import { AromaChart } from './AromaChart';
import { TextureChart } from './TextureChart';
import { FunctionChart } from './FunctionChart';
import { NutritionChart } from './NutritionChart';

const CHART_TABS: Array<{ key: ChartTab; label: string }> = [
  { key: 'taste', label: '味覚' },
  { key: 'aroma', label: '香り' },
  { key: 'texture', label: '食感' },
  { key: 'function', label: '用途' },
  { key: 'nutrition', label: '栄養' },
];

export function MultiChartTabs() {
  const chartTab = useSearchStore((s) => s.chartTab);
  const setChartTab = useSearchStore((s) => s.setChartTab);

  return (
    <div className="multi-chart-tabs">
      <div className="chart-tab-buttons">
        {CHART_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`chart-tab-button ${chartTab === tab.key ? 'active' : ''}`}
            onClick={() => setChartTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="chart-content">
        {chartTab === 'taste' && <TasteChart />}
        {chartTab === 'aroma' && <AromaChart />}
        {chartTab === 'texture' && <TextureChart />}
        {chartTab === 'function' && <FunctionChart />}
        {chartTab === 'nutrition' && <NutritionChart />}
      </div>
    </div>
  );
}
