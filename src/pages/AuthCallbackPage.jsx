import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { discordCallback } from '../api/client';
import './AuthCallbackPage.css';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('Accesso Discord negato.');
      setTimeout(() => navigate('/'), 3000);
      return;
    }

    if (!code) {
      navigate('/');
      return;
    }

    discordCallback(code)
      .then((res) => {
        if (res.status === 'OK' && res.data?.token) {
          localStorage.setItem('jwt_token', res.data.token);
          localStorage.setItem('user_game_name', res.data.userGameName);
          navigate('/dashboard');
        } else {
          setError(res.message || 'Accesso negato. Operativo non riconosciuto.');
          setTimeout(() => navigate('/'), 3500);
        }
      })
      .catch((err) => {
        setError(err.message || 'Errore di rete durante l\'autenticazione.');
        setTimeout(() => navigate('/'), 3500);
      });
  }, []);

  return (
    <div className="callback-wrapper">
      <div className="callback-card">
        <div className="callback-card__corner tl" />
        <div className="callback-card__corner tr" />
        <div className="callback-card__corner bl" />
        <div className="callback-card__corner br" />
        {error ? (
          <>
            <div className="callback-icon callback-icon--error">✕</div>
            <p className="callback-status callback-status--error">{error}</p>
            <p className="callback-hint">Reindirizzamento in corso…</p>
          </>
        ) : (
          <>
            <div className="callback-spinner" />
            <p className="callback-status">AUTENTICAZIONE IN CORSO</p>
            <p className="callback-hint">Verifica credenziali Discord…</p>
          </>
        )}
      </div>
    </div>
  );
}
