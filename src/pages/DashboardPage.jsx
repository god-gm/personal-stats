import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentSeason } from '../api/client';
import BossGroupCard from '../components/BossGroupCard';
import './DashboardPage.css';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const playerName = localStorage.getItem('user_game_name') || '';

  useEffect(() => {
    if (!localStorage.getItem('jwt_token')) {
      navigate('/');
      return;
    }
    getCurrentSeason()
      .then((res) => {
        if (res.status === 'OK') setData(res.data);
        else setError(res.message || 'Errore nel caricamento dati.');
      })
      .catch((err) => {
        if (err.status === 401) navigate('/');
        else setError(err.message || 'Errore di rete.');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  function handleLogout() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_game_name');
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
          {playerName && <span className="dash-header__player">{playerName}</span>}
          <button className="dash-logout-btn" onClick={handleLogout}>LOGOUT</button>
        </div>
      </header>

      <main className="dash-main">
        {loading && <p className="dash-status">Caricamento dati stagione corrente…</p>}
        {error && <p className="dash-error">{error}</p>}

        {data && (
          <>
            <div className="dash-season-bar">
              <span className="dash-season-label">Stagione</span>
              <span className="dash-season-value">{data.season}</span>
              <span className="dash-tokens-label">Token usati:</span>
              <span className="dash-tokens-value">{data.totalTokensUsed}</span>
              <span className="dash-bombs-label">Bombe usate:</span>
              <span className="dash-bombs-value">{data.totalBombsUsed}</span>
            </div>

            {data.bossGroups && data.bossGroups.length > 0
              ? data.bossGroups.map((group, i) => (
                  <BossGroupCard key={`${group.set}-${group.type}-${i}`} group={group} />
                ))
              : <p className="dash-status">Nessun dato disponibile per questa stagione.</p>
            }
          </>
        )}
      </main>
    </div>
  );
}
