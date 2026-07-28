import React, { useState } from 'react';
import PerformanceIndicator from './PerformanceIndicator';
import AdminStatsModal, { fmt as fmtEnUS } from './AdminStatsModal';
import { getTargetConsigliato, getTargetAttacks } from '../api/client';
import './BossGroupCard.css';

const CDN = 'https://cdn.ezekiel.snowprintstudios.com';

const fmt = (n) => (n != null ? n.toLocaleString('it-IT') : '—');

const ASSIGNMENT_LABELS = {
  consigliato:  'Recommended',
  affrontabile: 'Engageable',
  sconsigliato: 'Not Recommended',
  prioritario:  'Priority',
};

const CONSIGLIATO_COLUMNS = [
  { key: 'playerName', label: 'Player' },
];

const ATTACKS_COLUMNS = [
  { key: 'playerName',  label: 'Player' },
  { key: 'attackCount', label: 'Attacks', align: 'right' },
  { key: 'average',     label: 'Average', align: 'right', format: fmtEnUS },
];

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

function EncounterCard({ enc, isBoss, guildBest, isAdmin, rarity, onOpenAdminModal }) {
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
              {isBoss ? 'BOSS' : 'PRIME'}
            </span>
            <span className="enc-card__name-row">
              <span className="enc-card__name">{enc.name}</span>
              {isAdmin && (
                <span className="enc-admin-icons">
                  <button
                    className="enc-admin-icon-btn"
                    title="Show recommended players"
                    onClick={() => onOpenAdminModal('consigliato', enc, rarity)}
                  >
                    🎯
                  </button>
                  <button
                    className="enc-admin-icon-btn"
                    title="Show attackers"
                    onClick={() => onOpenAdminModal('attacks', enc, rarity)}
                  >
                    📊
                  </button>
                </span>
              )}
            </span>
          </div>
          <div className="enc-card__meta">
            <AssignmentBadge type={enc.assignmentType} />
            <PerformanceIndicator value={enc.performanceIndicator} />
          </div>
        </div>
      </div>
      <div className="enc-card__stats">
        <StatBlock label="ATTACKS"          value={enc.playerAttackCount} />
        <StatBlock label="PERSONAL AVERAGE" value={fmt(enc.playerAverage || null)} accent />
        <StatBlock label="PERSONAL BEST"    value={fmt(enc.playerBest || null)} />
        <StatBlock label="GUILD AVERAGE"    value={fmt(enc.guildAverage || null)} />
        <StatBlock label="GUILD BEST"       value={fmt(guildBest?.[enc.unitId] || null)} />
      </div>
    </div>
  );
}

export default function BossGroupCard({ group, guildBest, isAdmin }) {
  const [expanded, setExpanded] = useState(true);
  const [adminModal, setAdminModal] = useState(null); // { mode: 'consigliato'|'attacks', unitId, label }
  const { label, bossName, encounters } = group;

  const boss  = encounters.find((e) => e.encounterType === 'Boss');
  const sides = encounters.filter((e) => e.encounterType !== 'Boss');
  const rarity = label?.startsWith('M') ? 'Mythic' : 'Legendary';

  function openAdminModal(mode, enc) {
    setAdminModal({ mode, unitId: enc.unitId, label: enc.name });
  }

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
          {boss && (
            <EncounterCard
              enc={boss} isBoss={true} guildBest={guildBest}
              isAdmin={isAdmin} rarity={rarity} onOpenAdminModal={openAdminModal}
            />
          )}
          {sides.map((enc) => (
            <EncounterCard
              key={enc.unitId} enc={enc} isBoss={false} guildBest={guildBest}
              isAdmin={isAdmin} rarity={rarity} onOpenAdminModal={openAdminModal}
            />
          ))}
        </div>
      )}

      {adminModal && (
        <AdminStatsModal
          title={`${adminModal.label} — ${adminModal.mode === 'consigliato' ? 'RECOMMENDED PLAYERS' : 'ATTACKERS'}`}
          columns={adminModal.mode === 'consigliato' ? CONSIGLIATO_COLUMNS : ATTACKS_COLUMNS}
          fetcher={() => adminModal.mode === 'consigliato'
            ? getTargetConsigliato(adminModal.unitId, rarity)
            : getTargetAttacks(adminModal.unitId, rarity)}
          onClose={() => setAdminModal(null)}
        />
      )}
    </div>
  );
}
