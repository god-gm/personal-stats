import React from 'react';
import './PerformanceIndicator.css';

const CONFIG = {
  above:   { symbol: '▲', label: 'Above avg', cls: 'perf-above' },
  average: { symbol: '▬', label: 'Average',   cls: 'perf-average' },
  below:   { symbol: '▼', label: 'Below avg', cls: 'perf-below' },
};

export default function PerformanceIndicator({ value }) {
  const cfg = CONFIG[value];
  if (!cfg) return null;
  return (
    <span className={`perf-indicator ${cfg.cls}`} title={cfg.label}>
      {cfg.symbol}
    </span>
  );
}
