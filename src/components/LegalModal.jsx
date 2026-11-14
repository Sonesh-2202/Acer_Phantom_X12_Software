import React from 'react';
import { sound } from '../utils/audio';

export function LegalModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="tactical-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-head">
          <div className="dialog-title-group">
            <span className="dialog-dot"></span>
            <h2 className="text-base font-bold font-mono">PRIVACY &amp; INDEPENDENT TERMS</h2>
          </div>
          <button
            type="button"
            className="dialog-close"
            onClick={() => {
              sound.click();
              onClose();
            }}
          >
            <svg viewBox="0 0 18 18" className="w-5 h-5"><path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="currentColor" strokeWidth="2"/></svg>
          </button>
        </div>

        <div className="dialog-body space-y-4 text-xs text-text-secondary">
          <section>
            <h3 className="text-sm font-bold text-white mb-1">100% Client-Side Privacy</h3>
            <p>
              This application makes zero network requests and transmits no telemetry. All configurations, battery preferences, and saved scenes reside solely within your browser’s localStorage. WebHID communication flows strictly between your browser and the physical receiver.
            </p>
          </section>
          <section>
            <h3 className="text-sm font-bold text-white mb-1">Independent Disclaimer</h3>
            <p>
              Phantom Device Studio is an independent utility for tuning your own hardware. Acer, Nitro, and related trademarks are the property of their respective owners. This project is not affiliated with, endorsed by, or sponsored by Acer Inc.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
