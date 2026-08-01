import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getTokenUsage, getGuildStats } from '../api/client';
import './AdminStatsModal.css';

export const fmt = (n) => (n != null ? n.toLocaleString('en-US') : '—');

const CONFIGS = {
  'token-usage': {
    title: 'TOKEN USAGE',
    fetcher: getTokenUsage,
    columns: [
      { key: 'playerName', label: 'Player' },
      { key: 'tokenCount', label: 'Tokens', align: 'right' },
    ],
  },
  'guild-stats': {
    title: 'GUILD STATS',
    fetcher: getGuildStats,
    columns: [
      { key: 'playerName', label: 'Player' },
      { key: 'average',    label: 'Average', align: 'right', format: fmt },
    ],
  },
};

// Pass either `kind` (one of the fixed CONFIGS above) or a direct
// `title`/`columns`/`fetcher` triple for one-off, dynamically-parameterized modals
// (e.g. a specific boss/mini target on the dashboard).
export default function AdminStatsModal({ kind, title, columns, fetcher, onClose }) {
  const cfg = kind ? CONFIGS[kind] : { title, columns, fetcher };
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Runs once on mount: the modal is always freshly mounted per "open" action
  // (conditionally rendered by the parent), so there's no need to react to prop changes.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
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
    </div>,
    document.body
  );
}
