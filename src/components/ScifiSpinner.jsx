import React from 'react';
import './ScifiSpinner.css';

export default function ScifiSpinner({ message = 'ELABORAZIONE...' }) {
  return (
    <div className="scifi-overlay">
      <div className="scifi-panel">

        <div className="scifi-reticle">
          <div className="scifi-ring scifi-ring--outer" />
          <div className="scifi-ring scifi-ring--mid" />
          <div className="scifi-ring scifi-ring--inner" />
          <div className="scifi-crosshair scifi-crosshair--h" />
          <div className="scifi-crosshair scifi-crosshair--v" />
          <div className="scifi-core" />
        </div>

        <p className="scifi-msg">
          {message}<span className="scifi-cursor">_</span>
        </p>

        <div className="scifi-track">
          <div className="scifi-bar" />
        </div>

      </div>
    </div>
  );
}
