import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getSeasonRanking, getSeasonPlayerDetail } from '../api/client';
import './SeasonTableModal.css';

const CDN = 'https://cdn.ezekiel.snowprintstudios.com';

// Converts a game hero unitId (camelCase) to the CDN portrait api_id (snake_case).
// Mirrors the Python _to_api_id() logic from hm_war_analyzer.
const PREFIX_MAP = { eldar: 'aelda', orks: 'orkss', tau: 'tauta' };
const ID_OVERRIDES = {
  ultraEliminatorSgt:  'ultra_eliminator',
  ultraInceptorSgt:    'ultra_inceptor',
  thousInfernalMaster: 'thous_infernal',
  custoVexilusPraetor: 'custo_vexilus',
  templNpc1Initiate:   'templ_initiate',
  templSwordBrother:   'templ_brother',
  astraPrimarisPsy:    'astra_psyker',
  orksBigMek:          'orkss_mek',
  orksRukkatrukk:      'orkss_rukkatruk',
  eldarMauganRa:       'aelda_maugan',
  spaceBlackmane:      'space_ragnar',
  spaceRockfist:       'space_arjac',
  spaceStormcaller:    'space_njal',
  emperFlawlessBlade:  'emper_lucius',
  necroDestroyer:      'necro_hexmark',
};

function toApiId(gameId) {
  if (!gameId) return '';
  if (ID_OVERRIDES[gameId]) return ID_OVERRIDES[gameId];
  const match = gameId.match(/^([a-z]+)([A-Z].*)$/);
  if (!match) return gameId.toLowerCase();
  const prefix = PREFIX_MAP[match[1]] || match[1];
  return `${prefix}_${match[2].toLowerCase()}`;
}

function heroPortraitUrl(unitId) {
  return `${CDN}/ui_image_portrait_${toApiId(unitId)}_01.png`;
}

function bossImageUrl(unitId) {
  return `${CDN}/${unitId}_BattlePreviewPopUp.png`;
}

function fmtPci(n) {
  if (n == null) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function fmtDmg(n) {
  return n != null ? n.toLocaleString('en-US') : '—';
}

// Bar chart: ±PCI_SCALE % maps to half the bar width. Values beyond are capped.
const PCI_SCALE = 20;

function PciBar({ pci }) {
  const capped    = Math.min(Math.abs(pci ?? 0), PCI_SCALE);
  const widthPct  = (capped / PCI_SCALE) * 50;
  const isPos     = (pci ?? 0) >= 0;
  return (
    <div className="stm-pci-bar-wrap">
      <div
        className={`stm-pci-bar ${isPos ? 'stm-pci-bar--pos' : 'stm-pci-bar--neg'}`}
        style={{ width: `${widthPct}%` }}
      />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HeroPortrait({ unitId, isMow }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className={`stm-portrait${isMow ? ' stm-portrait--mow' : ''}`} title={unitId}>
      <img
        src={heroPortraitUrl(unitId)}
        alt={unitId}
        className="stm-portrait__img"
        onError={() => setHidden(true)}
      />
    </div>
  );
}

function BossPortrait({ unitId }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return <div className="stm-boss-img stm-boss-img--placeholder" />;
  return (
    <img
      src={bossImageUrl(unitId)}
      alt={unitId}
      className="stm-boss-img"
      onError={() => setHidden(true)}
    />
  );
}

function EncounterCard({ enc }) {
  const isBoss = enc.encounterType === 'Boss';
  const isSide = enc.encounterType === 'SideBoss';

  return (
    <div className={`stm-enc-card${enc.excludedFromRanking ? ' stm-enc-card--excluded' : ''}`}>
      <div className="stm-enc-card__left">
        <BossPortrait unitId={enc.unitId} />
      </div>

      <div className="stm-enc-card__body">
        <div className="stm-enc-card__top">
          <span className="stm-enc-card__name">{enc.name}</span>
          <div className="stm-enc-card__badges">
            <span className={`stm-badge stm-badge--type stm-badge--${isBoss ? 'boss' : 'side'}`}>
              {isBoss ? 'Boss' : 'Prime'}
            </span>
            <span className={`stm-badge stm-badge--rarity stm-badge--${enc.rarity?.toLowerCase()}`}>
              {enc.rarity}
            </span>
          </div>
        </div>

        <div className="stm-enc-card__stats">
          <span className="stm-enc-card__dmg">{fmtDmg(enc.damageDealt)}</span>
          {enc.guildAverage > 0 && (
            <span className="stm-enc-card__guild-avg" title="Media gilda">
              <span className="stm-enc-card__guild-avg-label">Ø</span>
              {fmtDmg(Math.round(enc.guildAverage))}
            </span>
          )}
          <span className="stm-enc-card__hp">
            <span className="stm-enc-card__hp-label">HP</span>
            <span className="stm-enc-card__hp-val">{fmtDmg(enc.maxHp)}</span>
            <span className="stm-enc-card__hp-arrow">→</span>
            <span className={`stm-enc-card__hp-val${enc.remainingHp === 0 ? ' stm-enc-card__hp-val--zero' : ''}`}>
              {fmtDmg(enc.remainingHp)}
            </span>
          </span>
          {enc.killingBlow && (
            <span className="stm-enc-card__kb" title="Killing Blow">
              {isBoss ? '💀 KB (excl.)' : isSide && enc.damageDealt === enc.maxHp ? '💀 One-shot' : '💀 KB (excl.)'}
            </span>
          )}
          {!enc.killingBlow && enc.excludedFromRanking && (
            <span className="stm-enc-card__excl">excl. (rarity)</span>
          )}
        </div>

        <div className="stm-enc-card__team">
          {enc.heroes?.map((h, i) => (
            <HeroPortrait key={i} unitId={h.unitId} isMow={false} />
          ))}
          {enc.machineOfWar && (
            <HeroPortrait unitId={enc.machineOfWar.unitId} isMow={true} />
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerDetail({ season, player, onBack }) {
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getSeasonPlayerDetail(season, player.userId)
      .then((res) => {
        if (cancelled) return;
        if (res.status === 'OK') setDetail(res.data);
        else setError(res.message || 'Error loading detail.');
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'Network error.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [season, player.userId]);

  return (
    <div className="stm-detail">
      <div className="stm-detail__header">
        <button className="stm-detail__back" onClick={onBack}>← Back</button>
        <span className="stm-detail__player">{player.playerName}</span>
        <span className="stm-detail__season">Season {season}</span>
      </div>

      {loading && <p className="stm-status">Loading…</p>}
      {error   && <p className="stm-error">{error}</p>}

      {!loading && !error && detail && (
        <div className="stm-detail__list">
          {detail.encounters.length === 0 && (
            <p className="stm-status">No Battle encounters found for this season.</p>
          )}
          {detail.encounters.map((enc, i) => (
            <EncounterCard key={i} enc={enc} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function SeasonTableModal({ currentSeason, onClose }) {
  const [selectedSeason, setSelectedSeason] = useState(currentSeason);
  const [rankingData, setRankingData]       = useState(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [detailPlayer, setDetailPlayer]     = useState(null); // { userId, playerName }

  const fetchRanking = useCallback((season) => {
    setLoading(true);
    setError('');
    setRankingData(null);
    getSeasonRanking(season)
      .then((res) => {
        if (res.status === 'OK') setRankingData(res.data);
        else setError(res.message || 'Error loading ranking.');
      })
      .catch((err) => setError(err.message || 'Network error.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRanking(selectedSeason);
  }, [selectedSeason, fetchRanking]);

  const availableSeasons = rankingData?.availableSeasons ?? [currentSeason, currentSeason - 1, currentSeason - 2];

  return createPortal(
    <div className="stm-overlay" onClick={onClose}>
      <div className="stm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="stm-modal__header">
          <span className="stm-modal__title">SEASON TABLE</span>
          <div className="stm-modal__header-right">
            <div className="stm-season-selector">
              <label className="stm-season-selector__label">Season</label>
              <select
                className="stm-season-selector__select"
                value={selectedSeason}
                onChange={(e) => {
                  setDetailPlayer(null);
                  setSelectedSeason(Number(e.target.value));
                }}
              >
                {availableSeasons.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <button className="stm-modal__close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="stm-modal__body">
          {detailPlayer ? (
            <PlayerDetail
              season={selectedSeason}
              player={detailPlayer}
              onBack={() => setDetailPlayer(null)}
            />
          ) : (
            <>
              {loading && <p className="stm-status">Loading…</p>}
              {error   && <p className="stm-error">{error}</p>}

              {!loading && !error && rankingData && (
                <div className="stm-table-wrap">
                  <table className="stm-table">
                    <thead>
                      <tr>
                        <th className="stm-th stm-th--rank">#</th>
                        <th className="stm-th">Player</th>
                        <th className="stm-th stm-th--right stm-th--pci">%PCI</th>
                        <th className="stm-th stm-th--chart"></th>
                        <th className="stm-th stm-th--right">Attacks</th>
                        <th className="stm-th stm-th--center">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankingData.ranking.map((r, i) => (
                        <tr key={r.userId} className="stm-tr">
                          <td className="stm-td stm-td--rank">{i + 1}</td>
                          <td className="stm-td stm-td--name">{r.playerName}</td>
                          <td className={`stm-td stm-td--right stm-td--pci${(r.pciPercent ?? 0) >= 0 ? ' stm-td--pos' : ' stm-td--neg'}`}>
                            {fmtPci(r.pciPercent)}
                          </td>
                          <td className="stm-td stm-td--chart">
                            <PciBar pci={r.pciPercent} />
                          </td>
                          <td className="stm-td stm-td--right">{r.validAttackCount}</td>
                          <td className="stm-td stm-td--center">
                            <button
                              className="stm-detail-btn"
                              onClick={() => setDetailPlayer({ userId: r.userId, playerName: r.playerName })}
                            >
                              ▶
                            </button>
                          </td>
                        </tr>
                      ))}
                      {rankingData.ranking.length === 0 && (
                        <tr>
                          <td className="stm-td stm-td--empty" colSpan={5}>No data for this season.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
