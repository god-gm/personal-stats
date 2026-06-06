import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import './LoginPage.css';

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;
const DISCORD_REDIRECT_URI = import.meta.env.VITE_DISCORD_REDIRECT_URI;

function buildDiscordUrl(prompt) {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify',
    prompt,
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

export default function LoginPage() {
  const [searchParams] = useSearchParams();

  // When AuthCallbackPage sends back ?retry=true it means prompt=none failed
  // because the user hasn't authorized yet — auto-retry showing the consent screen.
  useEffect(() => {
    if (searchParams.get('retry') === 'true') {
      window.location.href = buildDiscordUrl('consent');
    }
  }, []);

  function handleDiscordLogin() {
    // prompt=none: if the user has already authorized the app Discord redirects
    // silently without showing the consent screen — greatly reduces friction on
    // re-login after JWT expiry. For first-time users AuthCallbackPage will
    // catch the access_denied error and send them back here with ?retry=true.
    window.location.href = buildDiscordUrl('none');
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-card__corner tl" />
        <div className="login-card__corner tr" />
        <div className="login-card__corner bl" />
        <div className="login-card__corner br" />
        <div className="login-logo">☠</div>
        <h1 className="login-title">GODS OF DEATH</h1>
        <p className="login-subtitle">Guild Raid Performance Tracker</p>
        <div className="login-divider" />
        <p className="login-instructions">IDENTIFICA OPERATIVO TRAMITE DISCORD</p>
        <button className="login-discord-btn" onClick={handleDiscordLogin}>
          <svg className="login-discord-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.024.012.048.031.063a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
          ACCEDI CON DISCORD
        </button>
      </div>
    </div>
  );
}
