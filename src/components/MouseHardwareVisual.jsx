import React from 'react';

export function MouseHardwareVisual({
  activeEffect = 0,
  activeColor = '#A3FF12',
  activeDpi = 1200,
  activePolling = 1000,
  battery = 59,
  showCallouts = true,
  className = '',
}) {
  const isVoid = activeEffect === 6;
  const glowHex = isVoid ? '#1a1a1a' : activeColor;

  return (
    <div className={`mouse-hardware-visual ${className}`}>
      {/* Ambient Radial Backlight Glow */}
      <div
        className="mouse-ambient-backlight"
        style={{
          background: `radial-gradient(circle, ${glowHex} 0%, transparent 65%)`,
          opacity: isVoid ? 0.05 : 0.4,
        }}
      />

      {/* Hardware Chassis */}
      <div className="mouse-hardware-chassis">
        <img
          src={`${import.meta.env.BASE_URL}assets/mouse-wired.webp`}
          alt="Acer Nitro Phantom X12 Hardware Visualizer"
          className="mouse-hardware-image"
          width="720"
          height="1234"
        />

        {/* Floating Telemetry Callout Badges */}
        {showCallouts && (
          <>
            <div className="hud-callout callout-top-left">
              <div className="callout-badge">
                <span className="callout-label">SENSITIVITY</span>
                <span className="callout-val">{activeDpi.toLocaleString('en-US')} DPI</span>
              </div>
            </div>

            <div className="hud-callout callout-top-right">
              <div className="callout-badge">
                <span className="callout-label">POLLING RATE</span>
                <span className="callout-val">{activePolling} HZ / {(1000 / activePolling).toFixed(1)} MS</span>
              </div>
            </div>

            <div className="hud-callout callout-bottom-left">
              <div className="callout-badge">
                <span className="callout-label">BATTERY</span>
                <span className="callout-val">
                  {Number.isFinite(battery) ? `${battery}% BAT` : 'NO DATA'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
