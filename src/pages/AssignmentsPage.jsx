import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getLevels,
  getBosses,
  computeAssignmentStats,
  listSavedAssignments,
  saveAssignment,
  loadAssignment,
  checkAssignmentExists,
} from '../api/client';
import './AssignmentsPage.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

const ASSIGNMENT_TYPES = ['consigliato', 'affrontabile', 'sconsigliato'];
const ASSIGNMENT_LABELS = {
  consigliato:  '✓ Consigliato',
  affrontabile: '~ Affrontabile',
  sconsigliato: '✗ Sconsigliato',
};

// ── Main page ────────────────────────────────────────────────────────────────

export default function AssignmentsPage() {
  const navigate = useNavigate();

  // Anag data
  const [levels, setLevels] = useState([]);
  const [bosses, setBosses] = useState([]);

  // Configuration state: levelId → bossId
  const [config, setConfig] = useState({});

  // Stats result
  const [stats, setStats] = useState(null);
  const [computing, setComputing] = useState(false);
  const [computeError, setComputeError] = useState('');

  // Assignments editable state
  // key: playerId, value: { targetKey → 'consigliato'|'affrontabile'|'sconsigliato' }
  const [assignments, setAssignments] = useState({});

  // Detail popup
  const [detailTarget, setDetailTarget] = useState(null); // { key, label }

  // Save / Load
  const [savedList, setSavedList] = useState([]);
  const [saveName, setSaveName] = useState('');
  const [saveSeason, setSaveSeason] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadName, setLoadName] = useState('');
  const [loadSeason, setLoadSeason] = useState('');
  const [loadError, setLoadError] = useState('');

  // ── Load anag on mount ──────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([getLevels(), getBosses()])
      .then(([lvlRes, bossRes]) => {
        if (lvlRes.status === 'OK') setLevels(lvlRes.data);
        if (bossRes.status === 'OK') setBosses(bossRes.data);
      })
      .catch(() => {});
    refreshSavedList();
  }, []);

  // When stats arrive, initialise assignments from the computed initial state
  useEffect(() => {
    if (!stats) return;
    const init = {};
    for (const pa of stats.playerAssignments) {
      init[pa.userId] = { ...pa.assignments };
    }
    setAssignments(init);
    setSaveSeason(stats.currentSeason);
  }, [stats]);

  // Derive available season options for save/load
  const seasonOptions = saveSeason
    ? [saveSeason - 1, saveSeason, saveSeason + 1]
    : [];

  // ── Config helpers ──────────────────────────────────────────────────────
  const allConfigured = levels.length > 0 && levels.every(l => config[l.id]);

  function handleBossSelect(levelId, bossId) {
    setConfig(prev => ({ ...prev, [levelId]: bossId ? Number(bossId) : undefined }));
    // Reset stats when config changes
    setStats(null);
    setComputeError('');
  }

  // ── Compute ─────────────────────────────────────────────────────────────
  async function handleCompute() {
    setComputing(true);
    setComputeError('');
    try {
      const payload = levels.map(l => ({ levelId: l.id, bossId: config[l.id] }));
      const res = await computeAssignmentStats(payload);
      if (res.status === 'OK') {
        setStats(res.data);
      } else {
        setComputeError(res.message || 'Errore nel calcolo.');
      }
    } catch (e) {
      setComputeError(e.message || 'Errore di rete.');
    } finally {
      setComputing(false);
    }
  }

  // ── Assignment editing ───────────────────────────────────────────────────
  function setPlayerAssignment(userId, targetKey, value) {
    setAssignments(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [targetKey]: value },
    }));
  }

  // ── Counts per target ────────────────────────────────────────────────────
  function countByType(targetKey, type) {
    return Object.values(assignments).filter(a => a[targetKey] === type).length;
  }

  // ── Player summary ───────────────────────────────────────────────────────
  function playerSummary(userId) {
    const pa = assignments[userId] || {};
    const c = Object.values(pa).filter(v => v === 'consigliato').length;
    const a = Object.values(pa).filter(v => v === 'affrontabile').length;
    const s = Object.values(pa).filter(v => v === 'sconsigliato').length;
    return { c, a, s };
  }

  // ── All target keys (boss + minis) in order ──────────────────────────────
  function allTargetKeys() {
    if (!stats) return [];
    const keys = [];
    for (const b of stats.bosses) {
      keys.push({ key: b.apiType, label: b.bossDesc, isBoss: true, boss: b });
      for (const m of b.minis) {
        keys.push({ key: `${b.apiType}__${m.unitId}`, label: m.name, isBoss: false, mini: m, boss: b });
      }
    }
    return keys;
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      const checkRes = await checkAssignmentExists(saveName.trim(), saveSeason);
      const exists   = checkRes.status === 'OK' && checkRes.data === true;
      if (exists) {
        const confirmed = window.confirm(
          `Esiste già un salvataggio con nome "${saveName}" per la season ${saveSeason}.\n` +
          `Vuoi sovrascriverlo?`
        );
        if (!confirmed) { setSaving(false); return; }
      }
      const data = JSON.stringify({
        config,
        assignments,
        statsSnapshot: stats ? {
          bosses: stats.bosses.map(b => ({
            levelId: b.levelId, levelDesc: b.levelDesc,
            bossId: b.bossId,   bossDesc: b.bossDesc, apiType: b.apiType,
          })),
        } : null,
      });
      await saveAssignment(saveName.trim(), saveSeason, data);
      alert('Salvataggio effettuato!');
      await refreshSavedList();
    } catch (e) {
      alert('Errore nel salvataggio: ' + (e.message || 'sconosciuto'));
    } finally {
      setSaving(false);
    }
  }

  // ── Load ─────────────────────────────────────────────────────────────────
  async function handleLoad() {
    if (!loadName || !loadSeason) return;
    setLoadError('');
    try {
      const res = await loadAssignment(loadName, Number(loadSeason));
      if (res.status !== 'OK') { setLoadError(res.message || 'Non trovato'); return; }
      const parsed = JSON.parse(res.data);
      if (parsed.config)      setConfig(parsed.config);
      if (parsed.assignments) setAssignments(parsed.assignments);
      setSaveSeason(Number(loadSeason));
      setStats(null); // stats must be re-computed after loading
    } catch (e) {
      setLoadError('Errore nel caricamento: ' + (e.message || 'sconosciuto'));
    }
  }

  async function refreshSavedList() {
    try {
      const res = await listSavedAssignments();
      if (res.status === 'OK') setSavedList(res.data || []);
    } catch (_) {}
  }

  function handleLogout() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_game_name');
    localStorage.removeItem('user_role');
    navigate('/');
  }

  // ── Detail popup ─────────────────────────────────────────────────────────
  function openDetail(targetKey, label) {
    setDetailTarget({ key: targetKey, label });
  }
  function closeDetail() { setDetailTarget(null); }

  // ── Render ───────────────────────────────────────────────────────────────
  const targetKeys = allTargetKeys();
  const allPlayers = stats
    ? stats.playerAssignments.map(pa => ({
        userId: pa.userId,
        playerName: pa.playerName,
      }))
    : [];

  return (
    <div className="assign-wrapper">
      {/* Header */}
      <header className="dash-header">
        <div className="dash-header__logo">
          <span className="dash-header__icon">☠</span>
          <span className="dash-header__name">Gods of Death</span>
        </div>
        <div className="dash-header__right">
          <span className="dash-header__player">
            {localStorage.getItem('user_game_name') || ''}
          </span>
          <button className="dash-assignments-btn" onClick={() => navigate('/dashboard')}>
            DASHBOARD
          </button>
          <button className="dash-logout-btn" onClick={handleLogout}>LOGOUT</button>
        </div>
      </header>

      <main className="assign-main">
        {/* ── Section 1: Season configuration ─────────────────────────── */}
        <section className="assign-section">
          <h2 className="assign-section__title">CONFIGURAZIONE SEASON</h2>

          <div className="assign-config-grid">
            {levels.map(level => (
              <div key={level.id} className="assign-config-row">
                <span className="assign-config-row__label">{level.descrizione}</span>
                <select
                  className="assign-select"
                  value={config[level.id] || ''}
                  onChange={e => handleBossSelect(level.id, e.target.value)}
                >
                  <option value="">— seleziona boss —</option>
                  {bosses.map(b => (
                    <option key={b.id} value={b.id}>{b.descrizione}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <button
            className="assign-calc-btn"
            disabled={!allConfigured || computing}
            onClick={handleCompute}
          >
            {computing ? 'CALCOLO IN CORSO…' : 'CALCOLA'}
          </button>
          {computeError && <p className="assign-error">{computeError}</p>}
        </section>

        {/* ── Section 2: Save / Load ──────────────────────────────────── */}
        <section className="assign-section assign-section--saveload">
          <div className="assign-saveload">
            <div className="assign-saveload__block">
              <h3 className="assign-saveload__title">SALVA</h3>
              <div className="assign-saveload__row">
                <input
                  className="assign-input"
                  placeholder="Nome salvataggio"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                />
                <select
                  className="assign-select assign-select--sm"
                  value={saveSeason || ''}
                  onChange={e => setSaveSeason(Number(e.target.value))}
                >
                  {seasonOptions.length === 0 && (
                    <option value="">—</option>
                  )}
                  {seasonOptions.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  className="assign-action-btn"
                  disabled={saving || !saveName.trim() || !saveSeason}
                  onClick={handleSave}
                >
                  {saving ? '…' : 'SALVA'}
                </button>
              </div>
            </div>

            <div className="assign-saveload__block">
              <h3 className="assign-saveload__title">CARICA</h3>
              <div className="assign-saveload__row">
                <select
                  className="assign-select"
                  value={loadName}
                  onChange={e => {
                    const [n, s] = e.target.value.split('||');
                    setLoadName(n || '');
                    setLoadSeason(s || '');
                  }}
                >
                  <option value="">— seleziona —</option>
                  {savedList.map(s => (
                    <option key={`${s.name}||${s.seasonNumber}`} value={`${s.name}||${s.seasonNumber}`}>
                      {s.name} (S{s.seasonNumber})
                    </option>
                  ))}
                </select>
                <button
                  className="assign-action-btn"
                  disabled={!loadName}
                  onClick={handleLoad}
                >
                  CARICA
                </button>
              </div>
              {loadError && <p className="assign-error">{loadError}</p>}
            </div>
          </div>
        </section>

        {/* ── Section 3: Assignment table ─────────────────────────────── */}
        {stats && (
          <section className="assign-section assign-section--table">
            <h2 className="assign-section__title">
              ASSIGNMENT TABLE — Season {stats.currentSeason}
            </h2>

            <div className="assign-table-wrap">
              <table className="assign-table">
                <thead>
                  <tr>
                    <th className="assign-th assign-th--target">Boss / Mini</th>
                    <th className="assign-th assign-th--guild">Media Gilda</th>
                    <th className="assign-th assign-th--count">Cons.</th>
                    <th className="assign-th assign-th--count">Aff.</th>
                    <th className="assign-th assign-th--count">Scon.</th>
                    <th className="assign-th">Dettaglio</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.bosses.map(boss => (
                    <React.Fragment key={boss.apiType}>
                      {/* Boss row */}
                      <tr className="assign-tr assign-tr--boss">
                        <td className="assign-td assign-td--target">
                          <span className="assign-level-badge">{boss.levelDesc}</span>
                          {boss.bossDesc}
                          {boss.minis.length > 0 && (
                            <span className="assign-mini-count"> +{boss.minis.length} mini</span>
                          )}
                        </td>
                        <td className="assign-td assign-td--guild">{fmt(boss.guildAverage)}</td>
                        <td className="assign-td assign-td--count assign-count--cons">
                          {countByType(boss.apiType, 'consigliato')}
                        </td>
                        <td className="assign-td assign-td--count assign-count--aff">
                          {countByType(boss.apiType, 'affrontabile')}
                        </td>
                        <td className="assign-td assign-td--count assign-count--scon">
                          {countByType(boss.apiType, 'sconsigliato')}
                        </td>
                        <td className="assign-td">
                          <button
                            className="assign-detail-btn"
                            onClick={() => openDetail(boss.apiType, boss.bossDesc)}
                          >
                            ▶
                          </button>
                        </td>
                      </tr>
                      {/* Mini rows */}
                      {boss.minis.map(mini => {
                        const miniKey = `${boss.apiType}__${mini.unitId}`;
                        return (
                          <tr key={miniKey} className="assign-tr assign-tr--mini">
                            <td className="assign-td assign-td--target assign-td--mini">
                              └ {mini.name}
                            </td>
                            <td className="assign-td assign-td--guild">{fmt(mini.guildAverage)}</td>
                            <td className="assign-td assign-td--count assign-count--cons">
                              {countByType(miniKey, 'consigliato')}
                            </td>
                            <td className="assign-td assign-td--count assign-count--aff">
                              {countByType(miniKey, 'affrontabile')}
                            </td>
                            <td className="assign-td assign-td--count assign-count--scon">
                              {countByType(miniKey, 'sconsigliato')}
                            </td>
                            <td className="assign-td">
                              <button
                                className="assign-detail-btn"
                                onClick={() => openDetail(miniKey, `${boss.bossDesc} → ${mini.name}`)}
                              >
                                ▶
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Section 4: Player summary table ─────────────────────── */}
            <h2 className="assign-section__title assign-section__title--mt">
              RIEPILOGO PLAYER
            </h2>
            <div className="assign-table-wrap">
              <table className="assign-table">
                <thead>
                  <tr>
                    <th className="assign-th">Player</th>
                    <th className="assign-th assign-th--count">Consigliati</th>
                    <th className="assign-th assign-th--count">Affrontabili</th>
                    <th className="assign-th assign-th--count">Sconsigliati</th>
                  </tr>
                </thead>
                <tbody>
                  {allPlayers.map(p => {
                    const { c, a, s } = playerSummary(p.userId);
                    return (
                      <tr key={p.userId} className="assign-tr">
                        <td className="assign-td assign-td--player">{p.playerName}</td>
                        <td className="assign-td assign-td--count assign-count--cons">{c}</td>
                        <td className="assign-td assign-td--count assign-count--aff">{a}</td>
                        <td className="assign-td assign-td--count assign-count--scon">{s}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* ── Detail popup ───────────────────────────────────────────────────── */}
      {detailTarget && (
        <DetailPopup
          targetKey={detailTarget.key}
          label={detailTarget.label}
          stats={stats}
          assignments={assignments}
          setPlayerAssignment={setPlayerAssignment}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}

// ── Detail popup component ────────────────────────────────────────────────────

function DetailPopup({ targetKey, label, stats, assignments, setPlayerAssignment, onClose }) {
  const isMini   = targetKey.includes('__');
  const [bossType, miniUnitId] = isMini ? targetKey.split('__') : [targetKey, null];

  const bossData = stats.bosses.find(b => b.apiType === bossType);
  const miniData = isMini && bossData ? bossData.minis.find(m => m.unitId === miniUnitId) : null;
  const playerStats = (miniData ? miniData.playerStats : bossData?.playerStats) || [];
  const guildAvg = miniData ? miniData.guildAverage : (bossData ? bossData.guildAverage : 0);

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={e => e.stopPropagation()}>
        <div className="detail-modal__header">
          <span className="detail-modal__title">{label}</span>
          <button className="detail-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="detail-modal__guild">
          Media gilda: <strong>{(guildAvg / 1000).toFixed(1)}K</strong>
        </div>
        <div className="detail-table-wrap">
          <table className="detail-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Media</th>
                <th>Δ Gilda</th>
                <th>Attacchi</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {playerStats.map(ps => {
                const current = assignments[ps.userId]?.[targetKey] || 'sconsigliato';
                return (
                  <tr key={ps.userId} className={`detail-tr detail-tr--${current}`}>
                    <td className="detail-td">{ps.playerName}</td>
                    <td className="detail-td">{(ps.average / 1000).toFixed(1)}K</td>
                    <td className={`detail-td detail-delta${ps.delta >= 0 ? '--pos' : '--neg'}`}>
                      {ps.delta >= 0 ? '+' : ''}{(ps.delta / 1000).toFixed(1)}K
                    </td>
                    <td className="detail-td">{ps.attackCount}</td>
                    <td className="detail-td">
                      <select
                        className="detail-select"
                        value={current}
                        onChange={e => setPlayerAssignment(ps.userId, targetKey, e.target.value)}
                      >
                        {ASSIGNMENT_TYPES.map(t => (
                          <option key={t} value={t}>{ASSIGNMENT_LABELS[t]}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
