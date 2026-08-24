import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentSeason, getPlayerInfo, getCurrentSeasonGuildBest } from '../api/client';
import BossGroupCard from '../components/BossGroupCard';
import PlayerInfoPanel from '../components/PlayerInfoPanel';
import AdminStatsModal from '../components/AdminStatsModal';
import PlayerPerformancesModal from '../components/PlayerPerformancesModal';
import './DashboardPage.css';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [guildBest, setGuildBest] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [displayName, setDisplayName] = useState(localStorage.getItem('user_game_name') || '');
  const [activeAdminModal, setActiveAdminModal] = useState(null); // 'token-usage' | 'guild-stats' | 'player-performances' | null
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem('user_role') === 'ADMIN';

  useEffect(() => {
    if (!localStorage.getItem('jwt_token')) {
      navigate('/');
      return;
    }

    const seasonPromise = getCurrentSeason()
      .then((res) => {
        if (res.status === 'OK') setData(res.data);
        else setError(res.message || 'Error loading data.');
      })
      .catch((err) => {
        if (err.status === 401) navigate('/');
        else setError(err.message || 'Network error.');
      });

    const playerPromise = getPlayerInfo()
      .then((res) => {
        if (res.status === 'OK' && res.data) {
          setPlayerInfo(res.data);
          if (res.data.apiPlayerName) setDisplayName(res.data.apiPlayerName);
        }
      })
      .catch(() => {});

    const guildBestPromise = getCurrentSeasonGuildBest()
      .then((res) => {
        if (res.status === 'OK' && res.data) setGuildBest(res.data);
      })
      .catch(() => {});

    Promise.all([seasonPromise, playerPromise, guildBestPromise]).finally(() => setLoading(false));
  }, [navigate]);

  function handleLogout() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_game_name');
    localStorage.removeItem('user_role');
    navigate('/');
  }

  return (
    <div className="dash-wrapper">
      <header className="dash-header">
        <div className="dash-header__logo">
          <span className="dash-header__icon">☠</span>
          <span className="dash-header__name">HECATOMB</span>
        </div>
        <div className="dash-header__right">
          {displayName && <span className="dash-header__player">{displayName}</span>}
          {isAdmin && (
            <button
              className="dash-assignments-btn"
              onClick={() => navigate('/assignments')}
            >
              ASSIGNMENTS
            </button>
          )}
          <button className="dash-logout-btn" onClick={handleLogout}>LOGOUT</button>
        </div>
      </header>

      <main className="dash-main">
        {loading && <p className="dash-status">Loading current season data…</p>}
        {error && <p className="dash-error">{error}</p>}

        {data && (
          <>
            {playerInfo && <PlayerInfoPanel info={playerInfo} />}

            <div className="dash-season-bar">
              <span className="dash-season-label">Season</span>
              <span className="dash-season-value">{data.season}</span>
              <span className="dash-tokens-label">Tokens used:</span>
              <span className="dash-tokens-value">{data.totalTokensUsed}</span>
              <span className="dash-bombs-label">Bombs used:</span>
              <span className="dash-bombs-value">{data.totalBombsUsed}</span>
            </div>

            {(data.playerType === 'V' || data.playerType === 'R') && (
              <div className={`dash-playertype-bar dash-playertype-bar--${data.playerType}`}>
                {data.playerType === 'V' ? 'Vanguard' : 'Reaper'}
              </div>
            )}

            {isAdmin && (
              <div className="dash-admin-panel">
                <span className="dash-admin-panel__title">ADMIN PANEL</span>
                <div className="dash-admin-panel__actions">
                  <button
                    className="dash-admin-panel__btn"
                    onClick={() => setActiveAdminModal('token-usage')}
                  >
                    TOKEN USAGE
                  </button>
                  <button
                    className="dash-admin-panel__btn"
                    onClick={() => setActiveAdminModal('guild-stats')}
                  >
                    GUILD STATS
                  </button>
                  <button
                    className="dash-admin-panel__btn"
                    onClick={() => setActiveAdminModal('player-performances')}
                  >
                    PLAYERS PERFORMANCES
                  </button>
                </div>
              </div>
            )}

            {data.bossGroups && data.bossGroups.length > 0
              ? data.bossGroups.map((group, i) => (
                  <BossGroupCard key={`${group.set}-${group.type}-${i}`} group={group} guildBest={guildBest} isAdmin={isAdmin} />
                ))
              : <p className="dash-status">No data available for this season.</p>
            }

            {data.bossGroups && data.bossGroups.length > 0
              && data.playerType !== 'V' && data.playerType !== 'R' && (
              <div className="dash-legend">
                <span className="dash-legend__title">ASSIGNMENT LEGEND</span>
                <div className="dash-legend__items">
                  <div className="dash-legend__item">
                    <span className="dash-legend__badge dash-legend__badge--consigliato">Recommended</span>
                    <span className="dash-legend__desc">2/3 Tokens</span>
                  </div>
                  <div className="dash-legend__item">
                    <span className="dash-legend__badge dash-legend__badge--affrontabile">Engageable</span>
                    <span className="dash-legend__desc">1 Token</span>
                  </div>
                  <div className="dash-legend__item">
                    <span className="dash-legend__badge dash-legend__badge--sconsigliato">Not Recommended</span>
                    <span className="dash-legend__desc">0 Tokens (only to avoid going full)</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {activeAdminModal === 'token-usage' && (
        <AdminStatsModal kind="token-usage" onClose={() => setActiveAdminModal(null)} />
      )}
      {activeAdminModal === 'guild-stats' && (
        <AdminStatsModal kind="guild-stats" onClose={() => setActiveAdminModal(null)} />
      )}
      {activeAdminModal === 'player-performances' && (
        <PlayerPerformancesModal onClose={() => setActiveAdminModal(null)} />
      )}
    </div>
  );
}
