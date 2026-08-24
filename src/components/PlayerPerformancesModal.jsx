import React, { useState, useEffect } from 'react';
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
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [players, setPlayers]         = useState([]);
  const [targets, setTargets]         = useState([]);
  const [showTargetCols, setShowTargetCols] = useState(false);

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
                  <th className="player-perf-th player-perf-th--lost">Lost Tokens</th>
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
                {players.map(row => {
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
