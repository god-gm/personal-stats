import React, { useState } from 'react';
import PerformanceIndicator from './PerformanceIndicator';
import './BossGroupCard.css';

const fmt = (n) => (n != null ? n.toLocaleString('it-IT') : '—');

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

export default function BossGroupCard({ group }) {
  const [expanded, setExpanded] = useState(true);
  const { label, bossName, encounters } = group;

  const boss = encounters.find((e) => e.encounterType === 'Boss');
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
          {/* PRIMARY TARGET */}
          {boss && (
            <div className="enc-primary">
              <div className="enc-primary__header">
                <span className="enc-primary__skull">☠</span>
                <div className="enc-primary__title">
                  <span className="enc-primary__tag">OBIETTIVO PRIMARIO</span>
                  <span className="enc-primary__name">{boss.name}</span>
                </div>
                <div className="enc-primary__perf">
                  <PerformanceIndicator value={boss.performanceIndicator} />
                </div>
              </div>
              <div className="enc-primary__stats">
                <StatBlock label="ATTACCHI" value={boss.playerAttackCount} />
                <StatBlock label="MEDIA PERSONALE" value={fmt(boss.playerAverage)} accent />
                <StatBlock label="MEDIA GILDA" value={fmt(boss.guildAverage)} />
              </div>
            </div>
          )}

          {/* SECONDARY TARGETS */}
          {sides.length > 0 && (
            <div className="enc-secondaries">
              <div className="enc-secondaries__divider">
                <span className="enc-secondaries__line" />
                <span className="enc-secondaries__label">OBIETTIVI SECONDARI</span>
                <span className="enc-secondaries__line" />
              </div>
              <div className="enc-secondaries__grid">
                {sides.map((enc) => (
                  <div key={enc.unitId} className="enc-mini">
                    <div className="enc-mini__top">
                      <div className="enc-mini__title">
                        <span className="enc-mini__type-badge">SIDE</span>
                        <span className="enc-mini__name">{enc.name}</span>
                      </div>
                      <PerformanceIndicator value={enc.performanceIndicator} />
                    </div>
                    <div className="enc-mini__stats">
                      <StatBlock label="ATK" value={enc.playerAttackCount} />
                      <StatBlock label="PERS." value={fmt(enc.playerAverage)} accent />
                      <StatBlock label="GILDA" value={fmt(enc.guildAverage)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
