import React, { useEffect, useState } from 'react';
import { getTokenUsage, getGuildStats } from '../api/client';
import './AdminStatsModal.css';

const fmt = (n) => (n != null ? n.toLocaleString('en-US') : '—');

const CONFIGS = {
  'token-usage': {
    title: 'TOKEN USAGE',
    fetcher: getTokenUsage,
    columns: [
      { key: 'playerName',  label: 'Player' },
      { key: 'discordName', label: 'Discord' },
      { key: 'tokenCount',  label: 'Tokens', align: 'right' },
    ],
  },
  'guild-stats': {
    title: 'GUILD STATS',
    fetcher: getGuildStats,
    columns: [
      { key: 'playerName',  label: 'Player' },
      { key: 'discordName', label: 'Discord' },
      { key: 'average',     label: 'Average', align: 'right', format: fmt },
      { key: 'attackCount', label: 'Attacks', align: 'right' },
    ],
  },
};

export default function AdminStatsModal({ kind, onClose }) {
  const cfg = CONFIGS[kind];
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    cfg.fetcher()
      .then((res) => {
        if (cancelled) return;
        if (res.status === 'OK') setRows(res.data || []);
        else setError(res.message || 'Error loading data.');
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'Network error.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [cfg]);

  return (
    <div className="asm-overlay" onClick={onClose}>
      <div className="asm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="asm-modal__header">
          <span className="asm-modal__title">{cfg.title}</span>
          <button className="asm-modal__close" onClick={onClose}>✕</button>
        </div>

        {loading && <p className="asm-status">Loading…</p>}
        {error && <p className="asm-error">{error}</p>}

        {!loading && !error && (
          <div className="asm-table-wrap">
            <table className="asm-table">
              <thead>
                <tr>
                  {cfg.columns.map((c) => (
                    <th key={c.key} className={`asm-th${c.align === 'right' ? ' asm-th--right' : ''}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="asm-tr">
                    {cfg.columns.map((c) => (
                      <td key={c.key} className={`asm-td${c.align === 'right' ? ' asm-td--right' : ''}`}>
                        {c.format ? c.format(row[c.key]) : row[c.key]}
                      </td>
                    ))}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="asm-td asm-td--empty" colSpan={cfg.columns.length}>No data.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
