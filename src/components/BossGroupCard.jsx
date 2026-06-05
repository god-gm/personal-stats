import React, { useState } from 'react';
import EncounterRow from './EncounterRow';
import './BossGroupCard.css';

export default function BossGroupCard({ group }) {
  const [expanded, setExpanded] = useState(true);
  const { label, bossName, encounters } = group;

  return (
    <div className="boss-card">
      <button className="boss-card__header" onClick={() => setExpanded((v) => !v)}>
        <span className="boss-card__title">
          <span className="boss-card__label">{label}</span> — {bossName}
        </span>
        <span className="boss-card__chevron">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="boss-card__body">
          <table className="enc-table">
            <thead>
              <tr>
                <th>Boss / Side</th>
                <th className="th-right">Attacchi</th>
                <th className="th-right">Media personale</th>
                <th className="th-right">Media gilda</th>
                <th className="th-right">Performance</th>
              </tr>
            </thead>
            <tbody>
              {encounters.map((enc) => (
                <EncounterRow key={enc.unitId} encounter={enc} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
