import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentSeason, getPlayerInfo } from '../api/client';
import BossGroupCard from '../components/BossGroupCard';
import PlayerInfoPanel from '../components/PlayerInfoPanel';
import './DashboardPage.css';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [displayName, setDisplayName] = useState(localStorage.getItem('user_game_name') || '');
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
        else setError(res.message || 'Errore nel caricamento dati.');
      })
      .catch((err) => {
        if (err.status === 401) navigate('/');
        else setError(err.message || 'Errore di rete.');
      });

    const playerPromise = getPlayerInfo()
      .then((res) => {
        if (res.status === 'OK' && res.data) {
          setPlayerInfo(res.data);
          if (res.data.apiPlayerName) setDisplayName(res.data.apiPlayerName);
        }
      })
      .catch(() => {});

    Promise.all([seasonPromise, playerPromise]).finally(() => setLoading(false));
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
          <span className="dash-header__name">Gods of Death</span>
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
        {loading && <p className="dash-status">Caricamento dati stagione corrente…</p>}
        {error && <p className="dash-error">{error}</p>}

        {data && (
          <>
            {playerInfo && <PlayerInfoPanel info={playerInfo} />}

            <div className="dash-season-bar">
              <span className="dash-season-label">Stagione</span>
              <span className="dash-season-value">{data.season}</span>
              <span className="dash-tokens-label">Token usati:</span>
              <span className="dash-tokens-value">{data.totalTokensUsed}</span>
              <span className="dash-bombs-label">Bombe usate:</span>
              <span className="dash-bombs-value">{data.totalBombsUsed}</span>
            </div>

            {(data.playerType === 'V' || data.playerType === 'R') && (
              <div className={`dash-playertype-bar dash-playertype-bar--${data.playerType}`}>
                {data.playerType === 'V' ? 'Vanguard' : 'Reaper'}
              </div>
            )}

            {data.bossGroups && data.bossGroups.length > 0
              ? data.bossGroups.map((group, i) => (
                  <BossGroupCard key={`${group.set}-${group.type}-${i}`} group={group} />
                ))
              : <p className="dash-status">Nessun dato disponibile per questa stagione.</p>
            }

            {data.bossGroups && data.bossGroups.length > 0
              && data.playerType !== 'V' && data.playerType !== 'R' && (
              <div className="dash-legend">
                <span className="dash-legend__title">LEGENDA ASSEGNAZIONI</span>
                <div className="dash-legend__items">
                  <div className="dash-legend__item">
                    <span className="dash-legend__badge dash-legend__badge--consigliato">Consigliato</span>
                    <span className="dash-legend__desc">2/3 Token</span>
                  </div>
                  <div className="dash-legend__item">
                    <span className="dash-legend__badge dash-legend__badge--affrontabile">Affrontabile</span>
                    <span className="dash-legend__desc">1 Token</span>
                  </div>
                  <div className="dash-legend__item">
                    <span className="dash-legend__badge dash-legend__badge--sconsigliato">Sconsigliato</span>
                    <span className="dash-legend__desc">0 Token (solo per non andare full)</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
