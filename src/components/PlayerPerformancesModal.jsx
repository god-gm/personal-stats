import React, { useState, useEffect, useMemo } from 'react';
import { getPlayerTokenBreakdown } from '../api/client';
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
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [players, setPlayers]               = useState([]);
  const [targets, setTargets]               = useState([]);
  const [showTargetCols, setShowTargetCols] = useState(false);
  const [sortKey, setSortKey]               = useState('playerName');
  const [sortDir, setSortDir]               = useState('asc');

  useEffect(() => {
    getPlayerTokenBreakdown()
      .then(res => {
        if (res.status !== 'OK') {
          setError(res.message || 'Errore nel caricamento dei dati.');
          return;
        }
        setPlayers(res.data?.players ?? []);
        setTargets(res.data?.targets ?? []);
      })
      .catch(e => setError(e.message || 'Errore nel caricamento dei dati.'))
      .finally(() => setLoading(false));
  }, []);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function sortIcon(key) {
    if (sortKey !== key) return <span className="player-perf-th__sort-icon"> ⇅</span>;
    return (
      <span className="player-perf-th__sort-icon player-perf-th__sort-icon--active">
        {sortDir === 'asc' ? ' ▲' : ' ▼'}
      </span>
    );
  }

  const sortedPlayers = useMemo(() => {
    if (!players.length) return players;
    const dir = sortDir === 'asc' ? 1 : -1;

    return [...players].sort((a, b) => {
      if (sortKey === 'playerName') {
        return dir * (a.playerName ?? '').localeCompare(b.playerName ?? '', undefined, { sensitivity: 'base' });
      }
      if (sortKey === 'totalTokens') {
        return dir * ((a.totalTokens ?? 0) - (b.totalTokens ?? 0));
      }
      if (sortKey === 'lostTokens') {
        if (a.lostTokens == null && b.lostTokens == null) return 0;
        if (a.lostTokens == null) return 1;
        if (b.lostTokens == null) return -1;
        return dir * (a.lostTokens - b.lostTokens);
      }
      if (sortKey === 'recPct' || sortKey === 'engPct' || sortKey === 'notRecPct') {
        const pct = (row) => {
          const total = row.consigliatoTokens + row.affrontabileTokens + row.sconsigliatiTokens;
          if (total === 0) return 0;
          if (sortKey === 'recPct')    return row.consigliatoTokens  / total;
          if (sortKey === 'engPct')    return row.affrontabileTokens / total;
          return row.sconsigliatiTokens / total;
        };
        return dir * (pct(a) - pct(b));
      }
      // target column
      const target = targets.find(t => t.key === sortKey);
      if (!target) return 0;
      const aAvg = target.playerAverages?.[a.userId] ?? null;
      const bAvg = target.playerAverages?.[b.userId] ?? null;
      if (aAvg == null && bAvg == null) return 0;
      if (aAvg == null) return 1;
      if (bAvg == null) return -1;
      return dir * (aAvg - bAvg);
    });
  }, [players, targets, sortKey, sortDir]);

  function thProps(key, extraClass = '') {
    return {
      className: `player-perf-th player-perf-th--sortable${extraClass ? ` ${extraClass}` : ''}`,
      onClick: () => handleSort(key),
    };
  }

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
                  <th {...thProps('playerName', 'player-perf-th--name')}>
                    Player{sortIcon('playerName')}
                  </th>
                  <th {...thProps('totalTokens')}>
                    Token Played{sortIcon('totalTokens')}
                  </th>
                  <th {...thProps('lostTokens', 'player-perf-th--lost')}>
                    Lost Tokens{sortIcon('lostTokens')}
                  </th>
                  <th {...thProps('recPct', 'player-perf-th--rec')}>
                    Recommended %{sortIcon('recPct')}
                  </th>
                  <th {...thProps('engPct', 'player-perf-th--eng')}>
                    Engageable %{sortIcon('engPct')}
                  </th>
                  <th {...thProps('notRecPct', 'player-perf-th--nrec')}>
                    Not Recommended %{sortIcon('notRecPct')}
                  </th>
                  {showTargetCols && targets.map(t => (
                    <th key={t.key} {...thProps(t.key, 'player-perf-th--target')}>
                      {t.label}
                      <br />
                      <span className="player-perf-th__guild-avg">({fmt(t.guildAverage)})</span>
                      {sortIcon(t.key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map(row => {
                  const legMythTotal = row.consigliatoTokens + row.affrontabileTokens + row.sconsigliatiTokens;
                  const recPct    = legMythTotal > 0 ? Math.round((row.consigliatoTokens  / legMythTotal) * 100) : 0;
                  const engPct    = legMythTotal > 0 ? Math.round((row.affrontabileTokens / legMythTotal) * 100) : 0;
                  const notRecPct = legMythTotal > 0 ? Math.round((row.sconsigliatiTokens / legMythTotal) * 100) : 0;

                  return (
                    <tr key={row.userId} className="player-perf-tr">
                      <td className="player-perf-td player-perf-td--name">{row.playerName}</td>
                      <td className="player-perf-td player-perf-td--center">{row.totalTokens}</td>
                      <td
                        className="player-perf-td player-perf-td--center"
                        style={row.lostTokens == null ? {} : { color: row.lostTokens === 0 ? '#40c880' : '#f44336' }}
                      >
                        {row.lostTokens ?? '—'}
                      </td>
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
                        const avg   = t.playerAverages?.[row.userId] ?? null;
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
