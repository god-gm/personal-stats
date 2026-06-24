import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getLevels,
  getBosses,
  computeAssignmentStats,
  listSavedAssignments,
  saveAssignment,
  loadAssignment,
  loadHiddenSides,
  checkAssignmentExists,
} from '../api/client';
import ScifiSpinner from '../components/ScifiSpinner';
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

  // Hidden sides: Set of mini target keys that should be hidden in the dashboard
  const [hiddenSides, setHiddenSides] = useState(new Set());

  // Detail popup (boss/mini view)
  const [detailTarget, setDetailTarget] = useState(null);
  // Player detail popup (player-centric view)
  const [playerDetailTarget, setPlayerDetailTarget] = useState(null);

  // Save / Load
  const [savedList, setSavedList] = useState([]);
  const [saveName, setSaveName] = useState('');
  const [saveSeason, setSaveSeason] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadName, setLoadName] = useState('');
  const [loadSeason, setLoadSeason] = useState('');
  const [loadError, setLoadError] = useState('');
  const [exporting, setExporting] = useState(false);

  // Toast notification
  const [toast, setToast] = useState(null); // { message, type: 'success'|'error' }
  const toastTimer = useRef(null);

  // In-page overwrite confirm dialog
  const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm }

  // Ref to skip the assignments-init effect when loading from saved data
  const skipAssignmentInitRef = useRef(false);

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

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(toastTimer.current);
  }, [toast]);

  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  function showConfirm(message, onConfirm) {
    setConfirmDialog({ message, onConfirm });
  }

  // When stats arrive from a fresh compute, initialise assignments from the server suggestion.
  // Skip when loading from saved data (skipAssignmentInitRef guards this).
  useEffect(() => {
    if (!stats) return;
    if (skipAssignmentInitRef.current) {
      skipAssignmentInitRef.current = false;
      return;
    }
    const init = {};
    for (const pa of stats.playerAssignments) {
      init[pa.userId] = { ...pa.assignments };
    }
    setAssignments(init);
    setHiddenSides(new Set());
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

  function toggleHiddenSide(miniKey) {
    setHiddenSides(prev => {
      const next = new Set(prev);
      if (next.has(miniKey)) next.delete(miniKey);
      else next.add(miniKey);
      return next;
    });
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
      const bossKey = `${b.levelId}_${b.apiType}`;
      keys.push({ key: bossKey, label: b.bossDesc, isBoss: true, boss: b });
      for (const m of b.minis) {
        keys.push({ key: `${bossKey}__${m.unitId}`, label: m.name, isBoss: false, mini: m, boss: b });
      }
    }
    return keys;
  }

  function migrateAssignments(oldAssignments, bosses) {
    const bossLevels = {};
    for (const boss of bosses) {
      if (!bossLevels[boss.apiType]) bossLevels[boss.apiType] = [];
      bossLevels[boss.apiType].push(boss.levelId);
    }
    const result = {};
    for (const [userId, userAssignments] of Object.entries(oldAssignments)) {
      const migrated = {};
      for (const [key, value] of Object.entries(userAssignments)) {
        if (/^\d+_/.test(key)) {
          migrated[key] = value;
        } else {
          const apiType = key.includes('__') ? key.split('__')[0] : key;
          const levelIds = bossLevels[apiType] || [];
          for (const levelId of levelIds) {
            migrated[`${levelId}_${key}`] = value;
          }
        }
      }
      result[userId] = migrated;
    }
    return result;
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function doSave() {
    setSaving(true);
    try {
      const data = JSON.stringify({
        config,
        assignments,           // full per-player per-target state
        stats: stats || null,  // full stats object for immediate restore on load
        saveSeason,
      });
      await saveAssignment(saveName.trim(), saveSeason, data, [...hiddenSides]);
      showToast('Salvataggio effettuato con successo', 'success');
      await refreshSavedList();
    } catch (e) {
      showToast('Errore nel salvataggio: ' + (e.message || 'sconosciuto'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      const checkRes = await checkAssignmentExists(saveName.trim(), saveSeason);
      const exists   = checkRes.status === 'OK' && checkRes.data === true;
      if (exists) {
        setSaving(false);
        showConfirm(
          `Esiste già un salvataggio "${saveName}" per la season ${saveSeason}. Vuoi sovrascriverlo?`,
          () => doSave()
        );
        return;
      }
    } catch (_) { /* network error — proceed anyway */ }
    await doSave();
  }

  // ── Load ─────────────────────────────────────────────────────────────────
  async function handleLoad() {
    if (!loadName || !loadSeason) return;
    setLoadError('');
    setLoading(true);
    try {
      const res = await loadAssignment(loadName, Number(loadSeason));
      if (res.status !== 'OK') { setLoadError(res.message || 'Non trovato'); return; }
      const parsed = JSON.parse(res.data);
      if (parsed.config)      setConfig(parsed.config);
      if (parsed.assignments) {
        const bosses = parsed.stats?.bosses || [];
        setAssignments(bosses.length ? migrateAssignments(parsed.assignments, bosses) : parsed.assignments);
      }
      if (parsed.saveSeason)  setSaveSeason(parsed.saveSeason);
      else                    setSaveSeason(Number(loadSeason));
      if (parsed.stats) {
        // Restore saved stats without triggering the assignments-init effect
        skipAssignmentInitRef.current = true;
        setStats(parsed.stats);
      } else {
        setStats(null);
      }

      // Restore hidden sides from the dedicated table
      try {
        const hiddenRes = await loadHiddenSides(loadName);
        if (hiddenRes.status === 'OK') setHiddenSides(new Set(hiddenRes.data || []));
        else setHiddenSides(new Set());
      } catch (_) {
        setHiddenSides(new Set());
      }

      showToast('Caricamento completato', 'success');
    } catch (e) {
      setLoadError('Errore nel caricamento: ' + (e.message || 'sconosciuto'));
    } finally {
      setLoading(false);
    }
  }

  async function refreshSavedList() {
    try {
      const res = await listSavedAssignments();
      if (res.status === 'OK') setSavedList(res.data || []);
    } catch (_) {}
  }

  // ── Export ───────────────────────────────────────────────────────────────
  async function handleExport() {
    if (!stats) return;
    setExporting(true);
    try {
      const { default: ExcelJS } = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheetName = `S${stats.currentSeason}`;
      const ws = workbook.addWorksheet(sheetName);

      const targets = allTargetKeys();

      const CELL_FILL = {
        consigliato:  { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } },
        affrontabile: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8E1' } },
        sconsigliato: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } },
      };
      const CELL_FONT_COLOR = {
        consigliato:  { argb: 'FF2E7D32' },
        affrontabile: { argb: 'FFE65100' },
        sconsigliato: { argb: 'FFC62828' },
      };
      const LABEL_EXPORT = {
        consigliato:  'Consigliato',
        affrontabile: 'Affrontabile',
        sconsigliato: 'Sconsigliato',
      };
      const DARK_BG    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF070D18' } };
      const HEADER_BG  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1B2A' } };

      // ── Header row ──────────────────────────────────────────────────────
      const headerValues = [
        'PLAYER',
        'TOT. CONS.',
        ...targets.map(t =>
          t.isBoss
            ? `[${t.boss.levelDesc}][B] ${t.label}`
            : `[${t.boss.levelDesc}][S] ${t.label}`
        ),
      ];
      const hRow = ws.addRow(headerValues);
      hRow.height = 30;
      hRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FF00C8FF' }, size: 10 };
        cell.fill = HEADER_BG;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });
      hRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

      // Converts 1-based column index to Excel letter(s): 1→A, 27→AA, etc.
      function colLetter(n) {
        let s = '';
        while (n > 0) {
          const rem = (n - 1) % 26;
          s = String.fromCharCode(65 + rem) + s;
          n = Math.floor((n - 1) / 26);
        }
        return s;
      }

      // ── Player rows ──────────────────────────────────────────────────────
      // Column layout: 1=PLAYER, 2=TOT.CONS.(formula), 3..N+2=targets
      const players = stats.playerAssignments.map(pa => ({ userId: pa.userId, playerName: pa.playerName }));
      const firstDataRow = 2;                          // row 1 is header
      const lastDataRow  = firstDataRow + players.length - 1;
      const firstTargetCol = colLetter(3);
      const lastTargetCol  = colLetter(targets.length + 2);

      players.forEach((p, pIdx) => {
        const rowNum = firstDataRow + pIdx;
        const ua = assignments[p.userId] || {};
        const assignValues = targets.map(t => LABEL_EXPORT[ua[t.key] || 'sconsigliato']);
        // col 2 is left empty here — will be overwritten with formula below
        const row = ws.addRow([p.playerName, null, ...assignValues]);

        row.getCell(1).font = { bold: true, color: { argb: 'FFC8D8E8' }, size: 10 };
        row.getCell(1).fill = DARK_BG;

        const totCell = row.getCell(2);
        totCell.value = { formula: `COUNTIF(${firstTargetCol}${rowNum}:${lastTargetCol}${rowNum},"Consigliato")` };
        totCell.font = { bold: true, color: { argb: 'FF40C880' }, size: 10 };
        totCell.fill = DARK_BG;
        totCell.alignment = { horizontal: 'center', vertical: 'middle' };

        targets.forEach((t, idx) => {
          const val = ua[t.key] || 'sconsigliato';
          const cell = row.getCell(idx + 3);
          cell.fill = CELL_FILL[val];
          cell.font = { color: CELL_FONT_COLOR[val], size: 10 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      });

      // ── Total row ────────────────────────────────────────────────────────
      // col 2 = SUM of the TOT.CONS. column; cols 3..N+2 = COUNTIF per target
      const tRow = ws.addRow(['TOTALE', null, ...targets.map(() => null)]);

      // Grand total: sum of the TOT.CONS. column
      const bCol = colLetter(2);
      tRow.getCell(2).value = { formula: `SUM(${bCol}${firstDataRow}:${bCol}${lastDataRow})` };

      // Per-target count: COUNTIF down each target column
      targets.forEach((_, idx) => {
        const colIdx = idx + 3;
        const col = colLetter(colIdx);
        tRow.getCell(colIdx).value = {
          formula: `COUNTIF(${col}${firstDataRow}:${col}${lastDataRow},"Consigliato")`,
        };
      });

      tRow.eachCell((cell, col) => {
        cell.font = { bold: true, color: { argb: 'FFFFA040' }, size: 10 };
        cell.fill = HEADER_BG;
        if (col > 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // ── Column widths ─────────────────────────────────────────────────────
      ws.getColumn(1).width = 22;
      ws.getColumn(2).width = 12;
      for (let c = 3; c <= targets.length + 2; c++) {
        ws.getColumn(c).width = 18;
      }

      // ── Per-boss detail sheets ───────────────────────────────────────────
      // One sheet per boss with side-by-side Player/Media tables: one for the
      // boss itself, plus one per side that has at least one "consigliato" player.
      function sanitizeSheetName(name) {
        let s = String(name).replace(/[:\\/?*[\]]/g, '').trim();
        if (!s) s = 'Sheet';
        return s.slice(0, 31);
      }

      const usedSheetNames = new Set([sheetName]);
      function uniqueSheetName(base) {
        let candidate = sanitizeSheetName(base);
        let n = 2;
        while (usedSheetNames.has(candidate)) {
          const suffix = ` (${n})`;
          candidate = sanitizeSheetName(base).slice(0, 31 - suffix.length) + suffix;
          n++;
        }
        usedSheetNames.add(candidate);
        return candidate;
      }

      // Writes a titled Player/Media table starting at startCol; returns the last column used.
      function writeStatsTable(targetWs, startCol, title, guildAverage, playerStats) {
        targetWs.mergeCells(1, startCol, 1, startCol + 1);
        const titleCell = targetWs.getCell(1, startCol);
        titleCell.value = `${title} — Media gilda: ${fmt(guildAverage)}`;
        titleCell.font = { bold: true, color: { argb: 'FF00C8FF' }, size: 11 };
        titleCell.fill = HEADER_BG;
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        const headerRow = targetWs.getRow(2);
        headerRow.getCell(startCol).value = 'Player';
        headerRow.getCell(startCol + 1).value = 'Media';
        [startCol, startCol + 1].forEach(c => {
          const cell = headerRow.getCell(c);
          cell.font = { bold: true, color: { argb: 'FF00C8FF' }, size: 10 };
          cell.fill = HEADER_BG;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        const sorted = [...(playerStats || [])].sort((a, b) =>
          b.average !== a.average
            ? b.average - a.average
            : a.playerName.localeCompare(b.playerName)
        );

        sorted.forEach((ps, idx) => {
          const row = targetWs.getRow(3 + idx);
          const nameCell = row.getCell(startCol);
          const avgCell = row.getCell(startCol + 1);
          nameCell.value = ps.playerName;
          nameCell.font = { color: { argb: 'FFC8D8E8' }, size: 10 };
          nameCell.fill = DARK_BG;
          avgCell.value = ps.average;
          avgCell.numFmt = '#,##0';
          avgCell.font = { color: { argb: 'FFC8D8E8' }, size: 10 };
          avgCell.fill = DARK_BG;
          avgCell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        targetWs.getColumn(startCol).width = 22;
        targetWs.getColumn(startCol + 1).width = 14;

        return startCol + 1;
      }

      for (const b of stats.bosses) {
        const bossKey = `${b.levelId}_${b.apiType}`;
        const bws = workbook.addWorksheet(uniqueSheetName(`${b.levelDesc} ${b.bossDesc}`));

        let nextCol = writeStatsTable(bws, 1, b.bossDesc, b.guildAverage, b.playerStats) + 2;

        for (const m of b.minis) {
          const miniKey = `${bossKey}__${m.unitId}`;
          const hasConsigliato = Object.values(assignments).some(a => a[miniKey] === 'consigliato');
          if (!hasConsigliato) continue;
          nextCol = writeStatsTable(bws, nextCol, m.name, m.guildAverage, m.playerStats) + 2;
        }
      }

      // ── Download ──────────────────────────────────────────────────────────
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sheetName}_assignments.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast('Errore esportazione: ' + (err.message || 'sconosciuto'), 'error');
    } finally {
      setExporting(false);
    }
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

  function openPlayerDetail(userId, playerName) {
    setPlayerDetailTarget({ userId, playerName });
  }
  function closePlayerDetail() { setPlayerDetailTarget(null); }

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
                  value={loadName && loadSeason ? `${loadName}||${loadSeason}` : ''}
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
                    <th className="assign-th assign-th--hide">Hide</th>
                    <th className="assign-th">Dettaglio</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.bosses.map(boss => {
                    const bossKey = `${boss.levelId}_${boss.apiType}`;
                    return (
                    <React.Fragment key={bossKey}>
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
                          {countByType(bossKey, 'consigliato')}
                        </td>
                        <td className="assign-td assign-td--count assign-count--aff">
                          {countByType(bossKey, 'affrontabile')}
                        </td>
                        <td className="assign-td assign-td--count assign-count--scon">
                          {countByType(bossKey, 'sconsigliato')}
                        </td>
                        <td className="assign-td" />
                        <td className="assign-td">
                          <button
                            className="assign-detail-btn"
                            onClick={() => openDetail(bossKey, boss.bossDesc)}
                          >
                            ▶
                          </button>
                        </td>
                      </tr>
                      {/* Mini rows */}
                      {boss.minis.map(mini => {
                        const miniKey = `${bossKey}__${mini.unitId}`;
                        const isHidden = hiddenSides.has(miniKey);
                        return (
                          <tr key={miniKey} className={`assign-tr assign-tr--mini${isHidden ? ' assign-tr--hidden' : ''}`}>
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
                            <td className="assign-td assign-td--hide">
                              <input
                                type="checkbox"
                                className="assign-hide-check"
                                checked={isHidden}
                                onChange={() => toggleHiddenSide(miniKey)}
                                title="Nascondi nella dashboard"
                              />
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
                    );
                  })}
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
                    <th className="assign-th assign-th--count assign-count--cons">Cons.</th>
                    <th className="assign-th assign-th--count assign-count--aff">Aff.</th>
                    <th className="assign-th assign-th--count assign-count--scon">Scon.</th>
                    <th className="assign-th">Dettaglio</th>
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
                        <td className="assign-td">
                          <button
                            className="assign-detail-btn"
                            onClick={() => openPlayerDetail(p.userId, p.playerName)}
                          >
                            ▶
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="assign-export-row">
              <button
                className="assign-export-btn"
                disabled={exporting}
                onClick={handleExport}
              >
                {exporting ? '...' : 'EXPORT'}
              </button>
            </div>
          </section>
        )}
      </main>

      {/* ── Boss/mini detail popup ─────────────────────────────────────────── */}
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

      {/* ── Player detail popup ────────────────────────────────────────────── */}
      {playerDetailTarget && (
        <PlayerDetailPopup
          userId={playerDetailTarget.userId}
          playerName={playerDetailTarget.playerName}
          stats={stats}
          assignments={assignments}
          setPlayerAssignment={setPlayerAssignment}
          onClose={closePlayerDetail}
        />
      )}

      {/* ── Toast notification ─────────────────────────────────────────────── */}
      {toast && (
        <div className={`assign-toast assign-toast--${toast.type}`} onClick={() => setToast(null)}>
          <span className="assign-toast__icon">{toast.type === 'success' ? '✓' : '✕'}</span>
          <span className="assign-toast__msg">{toast.message}</span>
        </div>
      )}

      {/* ── Confirm dialog ─────────────────────────────────────────────────── */}
      {confirmDialog && (
        <div className="assign-confirm-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="assign-confirm-modal" onClick={e => e.stopPropagation()}>
            <p className="assign-confirm__msg">{confirmDialog.message}</p>
            <div className="assign-confirm__actions">
              <button
                className="assign-confirm__btn assign-confirm__btn--cancel"
                onClick={() => setConfirmDialog(null)}
              >
                ANNULLA
              </button>
              <button
                className="assign-confirm__btn assign-confirm__btn--ok"
                onClick={() => {
                  setConfirmDialog(null);
                  confirmDialog.onConfirm();
                }}
              >
                CONFERMA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading spinner ─────────────────────────────────────────────────── */}
      {(computing || saving || loading) && (
        <ScifiSpinner message={
          computing ? 'CALCOLO IN CORSO...' :
          saving    ? 'SALVATAGGIO...' :
                      'CARICAMENTO...'
        } />
      )}
    </div>
  );
}

// ── Colored assignment badge ──────────────────────────────────────────────────

function AssignBadge({ value }) {
  return (
    <span className={`assign-badge assign-badge--${value}`}>
      {ASSIGNMENT_LABELS[value]}
    </span>
  );
}

// ── Detail popup component ────────────────────────────────────────────────────

function DetailPopup({ targetKey, label, stats, assignments, setPlayerAssignment, onClose }) {
  const isMini = targetKey.includes('__');
  let levelId, apiType, miniUnitId;
  if (isMini) {
    const [bossWithLevel, mUnitId] = targetKey.split('__');
    const sepIdx = bossWithLevel.indexOf('_');
    levelId = parseInt(bossWithLevel.substring(0, sepIdx));
    apiType = bossWithLevel.substring(sepIdx + 1);
    miniUnitId = mUnitId;
  } else {
    const sepIdx = targetKey.indexOf('_');
    levelId = parseInt(targetKey.substring(0, sepIdx));
    apiType = targetKey.substring(sepIdx + 1);
  }

  const bossData = stats.bosses.find(b => b.apiType === apiType && b.levelId === levelId);
  const miniData = isMini && bossData ? bossData.minis.find(m => m.unitId === miniUnitId) : null;
  const rawPlayerStats = (miniData ? miniData.playerStats : bossData?.playerStats) || [];
  const playerStats = [...rawPlayerStats].sort((a, b) => a.playerName.localeCompare(b.playerName));
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
                        className={`detail-select detail-select--${current}`}
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

// ── Player detail popup component ─────────────────────────────────────────────

function PlayerDetailPopup({ userId, playerName, stats, assignments, setPlayerAssignment, onClose }) {
  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-modal detail-modal--player" onClick={e => e.stopPropagation()}>
        <div className="detail-modal__header">
          <span className="detail-modal__title">{playerName} — assegnazioni</span>
          <button className="detail-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="detail-table-wrap">
          <table className="detail-table">
            <thead>
              <tr>
                <th>Boss / Mini</th>
                <th>Assegnazione</th>
              </tr>
            </thead>
            <tbody>
              {stats.bosses.map(boss => {
                const bossKey = `${boss.levelId}_${boss.apiType}`;
                const bossVal = assignments[userId]?.[bossKey] || 'sconsigliato';

                return (
                  <React.Fragment key={bossKey}>
                    {/* Boss row */}
                    <tr className={`detail-tr detail-tr--${bossVal} detail-tr--boss`}>
                      <td className="detail-td detail-td--boss">
                        <span className="assign-level-badge">{boss.levelDesc}</span>
                        {boss.bossDesc}
                      </td>
                      <td className="detail-td">
                        <select
                          className={`detail-select detail-select--${bossVal}`}
                          value={bossVal}
                          onChange={e => setPlayerAssignment(userId, bossKey, e.target.value)}
                        >
                          {ASSIGNMENT_TYPES.map(t => (
                            <option key={t} value={t}>{ASSIGNMENT_LABELS[t]}</option>
                          ))}
                        </select>
                      </td>
                    </tr>

                    {/* Mini rows */}
                    {boss.minis.map(mini => {
                      const miniKey = `${bossKey}__${mini.unitId}`;
                      const miniVal = assignments[userId]?.[miniKey] || 'sconsigliato';
                      return (
                        <tr key={miniKey} className={`detail-tr detail-tr--${miniVal}`}>
                          <td className="detail-td detail-td--mini">└ {mini.name}</td>
                          <td className="detail-td">
                            <select
                              className={`detail-select detail-select--${miniVal}`}
                              value={miniVal}
                              onChange={e => setPlayerAssignment(userId, miniKey, e.target.value)}
                            >
                              {ASSIGNMENT_TYPES.map(t => (
                                <option key={t} value={t}>{ASSIGNMENT_LABELS[t]}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
