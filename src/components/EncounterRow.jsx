import React from 'react';
import PerformanceIndicator from './PerformanceIndicator';
import './EncounterRow.css';

const fmt = (n) =>
  n != null ? n.toLocaleString('it-IT') : '—';

export default function EncounterRow({ encounter }) {
  const { name, encounterType, guildAverage, playerAverage, playerAttackCount, performanceIndicator } = encounter;
  return (
    <tr className="encounter-row">
      <td className="enc-name">
        {name}
        {encounterType === 'Side' && <span className="enc-side-badge">Side</span>}
      </td>
      <td className="enc-attacks">{playerAttackCount}</td>
      <td className="enc-avg">{fmt(playerAverage)}</td>
      <td className="enc-guild">{fmt(guildAverage)}</td>
      <td className="enc-perf">
        <PerformanceIndicator value={performanceIndicator} />
      </td>
    </tr>
  );
}
