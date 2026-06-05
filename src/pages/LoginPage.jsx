import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/client';
import './LoginPage.css';

export default function LoginPage() {
  const [discordName, setDiscordName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const name = discordName.replace(/^@/, '').trim();
    if (!name) { setError('Inserisci il tuo username Discord.'); return; }
    setLoading(true);
    try {
      const res = await login(name);
      if (res.status === 'OK' && res.data?.token) {
        localStorage.setItem('jwt_token', res.data.token);
        localStorage.setItem('user_game_name', res.data.userGameName);
        navigate('/dashboard');
      } else {
        setError(res.message || 'Accesso negato.');
      }
    } catch (err) {
      setError(err.message || 'Errore di rete.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo">⚔</div>
        <h1 className="login-title">Gods of Death</h1>
        <p className="login-subtitle">Guild Raid Performance Tracker</p>
        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-label" htmlFor="discord-input">Username Discord</label>
          <input
            id="discord-input"
            className="login-input"
            type="text"
            placeholder="es. NomUtente"
            value={discordName}
            onChange={(e) => setDiscordName(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={loading}
          />
          {error && <p className="login-error">{error}</p>}
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Accesso…' : 'ACCEDI'}
          </button>
        </form>
      </div>
    </div>
  );
}
