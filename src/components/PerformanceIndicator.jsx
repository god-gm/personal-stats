import React from 'react';
import './PerformanceIndicator.css';

const CONFIG = {
  above:   { symbol: '▲', label: 'ABOVE AVERAGE', cls: 'perf-above' },
  average: { symbol: '▬', label: 'AT AVERAGE',    cls: 'perf-average' },
  below:   { symbol: '▼', label: 'BELOW AVERAGE', cls: 'perf-below' },
};

export default function PerformanceIndicator({ value }) {
  const cfg = CONFIG[value];
  if (!cfg) return null;
  return (
    <span className={`perf-indicator ${cfg.cls}`}>
      <span className="perf-indicator__symbol">{cfg.symbol}</span>
      <span className="perf-indicator__label">{cfg.label}</span>
    </span>
  );
}
