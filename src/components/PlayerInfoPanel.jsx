import React from 'react';
import './PlayerInfoPanel.css';

export default function PlayerInfoPanel({ info }) {
  return (
    <div className="pip">
      <div className="pip__block">
        <span className="pip__icon">⚡</span>
        <span className="pip__label">Raid Token</span>
        <span className="pip__value">{info.tokensCurrent} / {info.tokensMax}</span>
        {info.tokensNextAt
          ? <span className="pip__sub">Next: {info.tokensNextAt}</span>
          : <span className="pip__sub pip__sub--ready">Slot full</span>
        }
      </div>

      <div className="pip__divider" />

      <div className="pip__block">
        <span className="pip__icon">💣</span>
        <span className="pip__label">Bomb</span>
        {info.bombAvailable
          ? <span className="pip__value pip__value--ready">Available</span>
          : <>
              <span className="pip__value pip__value--used">Not available</span>
              {info.bombNextAt && <span className="pip__sub">Next: {info.bombNextAt}</span>}
            </>
        }
      </div>
    </div>
  );
}
