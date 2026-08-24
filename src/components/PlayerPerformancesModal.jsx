import React, { useState, useMemo, useEffect } from 'react';
import { listSavedAssignments, loadAssignment, getPlayerTokenBreakdown } from '../api/client';
import './PlayerPerformancesModal.css';

function fmt(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(Math.round(n));
}

function getAvgColor(playerAvg, guildAvg) {
  if (!guildAvg || playerAvg == null) return null;
  const ratio = (playerAvg - guildAvg) / guildAvg;
  if (ratio >= 0.10) return '#40c880';
  if (ratio <= -0.10) return '#f44336';
  return '#ffc107';
}

export default function PlayerPerformancesModal({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Token breakdown from new API (current season, correct counts)
  const [breakdown, setBreakdown] = useState([]); // [{ userId, playerName, totalTokens, consigliatoTokens, affrontabileTokens, sconsigliatiTokens }]

  // Stats and targets from the saved assignment blob (for damage average columns)
  const [targets, setTargets] = useState([]);      // [{ key, label, guildAverage, playerStatMap }]

  const [showTargetCols, setShowTargetCols] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Load token breakdown and saved assignment data in parallel
        const [breakdownRes, listRes] = await Promise.all([
          getPlayerTokenBreakdown(),
          listSavedAssignments(),
        ]);

        if (breakdownRes.status !== 'OK') {
          setError(breakdownRes.message || 'Errore nel caricamento del breakdown token.');
          return;
        }
        setBreakdown(breakdownRes.data ?? []);

        // Load saved assignment for damage average columns
        if (listRes.status === 'OK' && listRes.data?.length) {
          const latest = listRes.data[0];
          const loadRes = await loadAssignment(latest.name, latest.seasonNumber);
          if (loadRes.status === 'OK' && loadRes.data) {
            const blob = JSON.parse(loadRes.data);
            setTargets(buildTargets(blob.stats));
          }
        }
      } catch (e) {
        setError(e.message || 'Errore nel caricamento dei dati.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="player-perf-overlay" onClick={onClose}>
      <div className="player-perf-modal" onClick={e => e.stopPropagation()}>
        <div className="player-perf-modal__header">
          <span className="player-perf-modal__title">PLAYERS PERFORMANCES</span>
          <div className="player-perf-modal__actions">
            {!loading && !error && (
              <button
                className="player-perf-toggle-btn"
                onClick={() => setShowTargetCols(v => !v)}
              >
                {showTargetCols ? '◀ NASCONDI TARGET' : '▶ MOSTRA TARGET'}
              </button>
            )}
            <button className="player-perf-modal__close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="player-perf-table-wrap">
          {loading && <p className="player-perf-status">Caricamento...</p>}
          {error   && <p className="player-perf-status player-perf-status--error">{error}</p>}

          {!loading && !error && (
            <table className="player-perf-table">
              <thead>
                <tr>
                  <th className="player-perf-th player-perf-th--name">Player</th>
                  <th className="player-perf-th">Token Played</th>
                  <th className="player-perf-th player-perf-th--rec">Recommended %</th>
                  <th className="player-perf-th player-perf-th--eng">Engageable %</th>
                  <th className="player-perf-th player-perf-th--nrec">Not Recommended %</th>
                  {showTargetCols && targets.map(t => (
                    <th key={t.key} className="player-perf-th player-perf-th--target">
                      {t.label}
                      <br />
                      <span className="player-perf-th__guild-avg">({fmt(t.guildAverage)})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {breakdown.map(row => {
                  const total = row.totalTokens;
                  const recPct    = total > 0 ? Math.round((row.consigliatoTokens  / total) * 100) : 0;
                  const engPct    = total > 0 ? Math.round((row.affrontabileTokens / total) * 100) : 0;
                  const notRecPct = total > 0 ? Math.round((row.sconsigliatiTokens / total) * 100) : 0;

                  return (
                    <tr key={row.userId} className="player-perf-tr">
                      <td className="player-perf-td player-perf-td--name">{row.playerName}</td>
                      <td className="player-perf-td player-perf-td--center">{total}</td>
                      <td className="player-perf-td player-perf-td--center player-perf-td--rec">
                        {recPct}% ({row.consigliatoTokens})
                      </td>
                      <td className="player-perf-td player-perf-td--center player-perf-td--eng">
                        {engPct}% ({row.affrontabileTokens})
                      </td>
                      <td className="player-perf-td player-perf-td--center player-perf-td--nrec">
                        {notRecPct}% ({row.sconsigliatiTokens})
                      </td>
                      {showTargetCols && targets.map(t => {
                        const avg   = t.playerStatMap[row.userId] ?? null;
                        const color = avg != null ? getAvgColor(avg, t.guildAverage) : null;
                        return (
                          <td
                            key={t.key}
                            className="player-perf-td player-perf-td--center"
                            style={color ? { color } : {}}
                          >
                            {avg != null ? fmt(avg) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function buildTargets(stats) {
  if (!stats?.bosses) return [];
  const targets = [];
  for (const b of stats.bosses) {
    const bossKey = `${b.levelId}_${b.apiType}`;
    targets.push({
      key: bossKey,
      label: b.bossDesc,
      guildAverage: b.guildAverage,
      playerStatMap: buildPlayerStatMap(b.playerStats),
    });
    for (const m of b.minis ?? []) {
      targets.push({
        key: `${bossKey}__${m.unitId}`,
        label: m.name,
        guildAverage: m.guildAverage,
        playerStatMap: buildPlayerStatMap(m.playerStats),
      });
    }
  }
  return targets;
}

function buildPlayerStatMap(playerStats) {
  const map = {};
  for (const ps of playerStats ?? []) {
    map[ps.userId] = ps.average;
  }
  return map;
}
