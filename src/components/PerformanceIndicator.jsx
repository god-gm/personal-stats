import React from 'react';
import './PerformanceIndicator.css';

const CONFIG = {
  above:   { symbol: '▲', label: 'SOPRA MEDIA', cls: 'perf-above' },
  average: { symbol: '▬', label: 'IN MEDIA',    cls: 'perf-average' },
  below:   { symbol: '▼', label: 'SOTTO MEDIA', cls: 'perf-below' },
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
