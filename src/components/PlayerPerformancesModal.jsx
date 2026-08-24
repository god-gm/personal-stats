import React, { useState, useMemo, useEffect } from 'react';
import { listSavedAssignments, loadAssignment } from '../api/client';
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
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [extraPlayers, setExtraPlayers] = useState([]);
  const [showTargetCols, setShowTargetCols] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const listRes = await listSavedAssignments();
        if (listRes.status !== 'OK' || !listRes.data?.length) {
          setError('Nessun assignment salvato trovato.');
          return;
        }
        const latest = listRes.data[0];
        const loadRes = await loadAssignment(latest.name, latest.seasonNumber);
        if (loadRes.status !== 'OK' || !loadRes.data) {
          setError('Impossibile caricare i dati dell\'assignment.');
          return;
        }
        const blob = JSON.parse(loadRes.data);
        setStats(blob.stats ?? null);
        setAssignments(blob.assignments ?? {});
        setExtraPlayers(blob.extraPlayers ?? []);
      } catch (e) {
        setError(e.message || 'Errore nel caricamento dei dati.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const targets = useMemo(() => {
    const result = [];
    if (!stats?.bosses) return result;
    for (const b of stats.bosses) {
      const bossKey = `${b.levelId}_${b.apiType}`;
      result.push({
        key: bossKey,
        label: b.bossDesc,
        guildAverage: b.guildAverage,
        playerStats: b.playerStats ?? [],
      });
      for (const m of b.minis ?? []) {
        result.push({
          key: `${bossKey}__${m.unitId}`,
          label: m.name,
          guildAverage: m.guildAverage,
          playerStats: m.playerStats ?? [],
        });
      }
    }
    return result;
  }, [stats]);

  const allPlayers = useMemo(() => {
    const base = stats?.playerAssignments?.map(pa => ({ userId: pa.userId, playerName: pa.playerName })) ?? [];
    return [...base, ...extraPlayers].sort((a, b) => a.playerName.localeCompare(b.playerName));
  }, [stats, extraPlayers]);

  const targetStatMap = useMemo(() => {
    const map = {};
    for (const t of targets) {
      const playerMap = {};
      for (const ps of t.playerStats) {
        playerMap[ps.userId] = { average: ps.average, attackCount: ps.attackCount };
      }
      map[t.key] = playerMap;
    }
    return map;
  }, [targets]);

  const rows = useMemo(() => {
    return allPlayers.map(player => {
      const playerAsgn = assignments[player.userId] ?? {};
      let totalTokens = 0;
      let recTokens = 0;
      let engTokens = 0;
      let notRecTokens = 0;
      const targetAvgMap = {};

      for (const t of targets) {
        const stat = targetStatMap[t.key]?.[player.userId];
        const attackCount = stat?.attackCount ?? 0;
        const assignType = playerAsgn[t.key] ?? 'sconsigliato';

        totalTokens += attackCount;
        if (assignType === 'consigliato') recTokens += attackCount;
        else if (assignType === 'affrontabile') engTokens += attackCount;
        else notRecTokens += attackCount;

        targetAvgMap[t.key] = stat?.average ?? null;
      }

      const recPct = totalTokens > 0 ? Math.round((recTokens / totalTokens) * 100) : 0;
      const engPct = totalTokens > 0 ? Math.round((engTokens / totalTokens) * 100) : 0;
      const notRecPct = totalTokens > 0 ? Math.round((notRecTokens / totalTokens) * 100) : 0;

      return {
        ...player,
        totalTokens,
        recTokens, recPct,
        engTokens, engPct,
        notRecTokens, notRecPct,
        targetAvgMap,
      };
    });
  }, [allPlayers, assignments, targets, targetStatMap]);

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
          {loading && (
            <p className="player-perf-status">Caricamento...</p>
          )}
          {error && (
            <p className="player-perf-status player-perf-status--error">{error}</p>
          )}
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
                {rows.map(row => (
                  <tr key={row.userId} className="player-perf-tr">
                    <td className="player-perf-td player-perf-td--name">{row.playerName}</td>
                    <td className="player-perf-td player-perf-td--center">{row.totalTokens}</td>
                    <td className="player-perf-td player-perf-td--center player-perf-td--rec">
                      {row.recPct}% ({row.recTokens})
                    </td>
                    <td className="player-perf-td player-perf-td--center player-perf-td--eng">
                      {row.engPct}% ({row.engTokens})
                    </td>
                    <td className="player-perf-td player-perf-td--center player-perf-td--nrec">
                      {row.notRecPct}% ({row.notRecTokens})
                    </td>
                    {showTargetCols && targets.map(t => {
                      const avg = row.targetAvgMap[t.key];
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
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
