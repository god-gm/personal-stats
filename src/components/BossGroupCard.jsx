import React, { useState } from 'react';
import PerformanceIndicator from './PerformanceIndicator';
import './BossGroupCard.css';

const CDN = 'https://cdn.ezekiel.snowprintstudios.com';

const fmt = (n) => (n != null ? n.toLocaleString('it-IT') : '—');

const ASSIGNMENT_LABELS = {
  consigliato:  'Consigliato',
  affrontabile: 'Affrontabile',
  sconsigliato: 'Sconsigliato',
};

function AssignmentBadge({ type }) {
  if (!type || !ASSIGNMENT_LABELS[type]) return null;
  return (
    <span className={`enc-assign-badge enc-assign-badge--${type}`}>
      {ASSIGNMENT_LABELS[type]}
    </span>
  );
}

function StatBlock({ label, value, accent }) {
  return (
    <div className="stat-block">
      <span className="stat-block__label">{label}</span>
      <span className={`stat-block__value${accent ? ' stat-block__value--accent' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function EncounterCard({ enc, isBoss }) {
  return (
    <div className={`enc-card ${isBoss ? 'enc-card--boss' : 'enc-card--side'}`}>
      <div className="enc-card__header">
        <img
          className="enc-card__portrait"
          src={`${CDN}/${enc.unitId}_BattlePreviewPopUp.png`}
          alt=""
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <div className="enc-card__header-content">
          <div className="enc-card__title-group">
            <span className={`enc-card__tag ${isBoss ? 'enc-card__tag--boss' : 'enc-card__tag--side'}`}>
              {isBoss ? 'BOSS' : 'SIDE'}
            </span>
            <span className="enc-card__name">{enc.name}</span>
          </div>
          <div className="enc-card__meta">
            <AssignmentBadge type={enc.assignmentType} />
            <PerformanceIndicator value={enc.performanceIndicator} />
          </div>
        </div>
      </div>
      <div className="enc-card__stats">
        <StatBlock label="ATTACCHI"         value={enc.playerAttackCount} />
        <StatBlock label="MEDIA PERSONALE"  value={fmt(enc.playerAverage)} accent />
        <StatBlock label="TOP RUN PERS."    value={fmt(enc.playerBest || null)} />
        <StatBlock label="MEDIA GILDA"      value={fmt(enc.guildAverage)} />
      </div>
    </div>
  );
}

export default function BossGroupCard({ group }) {
  const [expanded, setExpanded] = useState(true);
  const { label, bossName, encounters } = group;

  const boss  = encounters.find((e) => e.encounterType === 'Boss');
  const sides = encounters.filter((e) => e.encounterType !== 'Boss');

  return (
    <div className="bgc">
      <button className="bgc__toggle" onClick={() => setExpanded((v) => !v)}>
        <div className="bgc__toggle-left">
          <span className="bgc__set-tag">{label}</span>
          <span className="bgc__boss-name">{bossName}</span>
        </div>
        <span className="bgc__chevron">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="bgc__body">
          {boss && <EncounterCard enc={boss} isBoss={true} />}
          {sides.map((enc) => (
            <EncounterCard key={enc.unitId} enc={enc} isBoss={false} />
          ))}
        </div>
      )}
    </div>
  );
}
