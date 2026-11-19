import React, { useState } from 'react';
import { sound } from '../utils/audio';

export function PatronageModal({ isOpen, onClose }) {
  const [upiCopied, setUpiCopied] = useState(false);
  if (!isOpen) return null;

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText('sonesh2202@okicici');
      setUpiCopied(true);
      window.setTimeout(() => setUpiCopied(false), 1800);
    } catch {
      setUpiCopied(false);
    }
  };

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
            <h2 className="text-base font-bold font-mono">SUPPORT HARDWARE REVERSE-ENGINEERING</h2>
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

        <div className="dialog-body">
          <p className="dialog-lead text-sm font-semibold mb-2">
            Phantom Device Studio is an independent, non-commercial hardware research initiative.
          </p>
          <p className="dialog-desc text-xs text-text-secondary leading-relaxed mb-6">
            Your support helps fund USB hardware analyzers, wireless receivers, and prototype devices for compatibility testing.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <a
              href="https://github.com/sponsors/sonesh-2202"
              target="_blank"
              rel="noopener noreferrer"
              className="plate-chip p-4"
              onClick={() => sound.click()}
            >
              <span className="text-volt font-bold text-lg mb-1">★</span>
              <b className="text-sm">GitHub Sponsors</b>
              <small className="text-xs text-text-muted">Monthly or one-time</small>
            </a>
            <a
              href="https://ko-fi.com"
              target="_blank"
              rel="noopener noreferrer"
              className="plate-chip p-4"
              onClick={() => sound.click()}
            >
              <span className="text-volt font-bold text-lg mb-1">☕</span>
              <b className="text-sm">Buy Me a Coffee</b>
              <small className="text-xs text-text-muted">Support dev research</small>
            </a>
          </div>

          <section className="upi-payment-section" aria-labelledby="upi-payment-title">
            <div className="upi-payment-heading">
              <div>
                <h3 id="upi-payment-title">PAY WITH UPI</h3>
                <p>Scan this QR code with any UPI app.</p>
              </div>
              <div className="upi-id-copy">
                <code>sonesh2202@okicici</code>
                <button type="button" onClick={copyUpiId}>
                  {upiCopied ? 'COPIED' : 'COPY ID'}
                </button>
              </div>
            </div>
            <img
              className="upi-payment-qr"
              src={`${import.meta.env.BASE_URL}upi-qr.png`}
              alt="UPI payment QR code for sonesh2202@okicici"
              width="1152"
              height="2048"
            />
          </section>

          <div className="dialog-footnote text-[11px] text-text-muted border-t border-panel-border pt-3">
            <span>No proprietary code or copyrighted binaries are sold. All research is published for public benefit.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
