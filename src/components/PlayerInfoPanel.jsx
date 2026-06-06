import React from 'react';
import './PlayerInfoPanel.css';

export default function PlayerInfoPanel({ info }) {
  return (
    <div className="pip">
      <div className="pip__block">
        <span className="pip__icon">⚡</span>
        <span className="pip__label">Token raid</span>
        <span className="pip__value">{info.tokensCurrent} / {info.tokensMax}</span>
        {info.tokensNextAt
          ? <span className="pip__sub">Prossimo: {info.tokensNextAt}</span>
          : <span className="pip__sub pip__sub--ready">Slot pieno</span>
        }
      </div>

      <div className="pip__divider" />

      <div className="pip__block">
        <span className="pip__icon">💣</span>
        <span className="pip__label">Bomba</span>
        {info.bombAvailable
          ? <span className="pip__value pip__value--ready">Disponibile</span>
          : <>
              <span className="pip__value pip__value--used">Non disponibile</span>
              {info.bombNextAt && <span className="pip__sub">Prossima: {info.bombNextAt}</span>}
            </>
        }
      </div>
    </div>
  );
}
