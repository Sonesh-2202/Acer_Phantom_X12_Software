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
  const glowOpacity = isVoid ? 0.05 : 0.85;

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

        {/* Lighting overlay */}
        <svg
          viewBox="0 0 720 1234"
          className="mouse-hardware-overlay"
          aria-hidden="true"
        >
          {/* Scroll Wheel RGB Zone */}
          <rect
            x="338"
            y="240"
            width="44"
            height="92"
            rx="14"
            className="transition-all duration-400"
            style={{
              fill: glowHex,
              opacity: glowOpacity,
              filter: isVoid ? 'none' : `drop-shadow(0 0 10px ${glowHex})`,
            }}
          />

          {/* DPI Button Indicator */}
          <rect
            x="344"
            y="414"
            width="32"
            height="42"
            rx="8"
            className="transition-all duration-300"
            style={{
              fill: isVoid ? '#222' : 'var(--volt)',
              opacity: isVoid ? 0.2 : 0.9,
              filter: isVoid ? 'none' : 'drop-shadow(0 0 6px var(--volt))',
            }}
          />

          {/* Honeycomb Palm RGB Array */}
          <g
            className="transition-all duration-500"
            style={{
              opacity: glowOpacity,
            }}
          >
            <polygon
              points="360,760 376,770 376,790 360,800 344,790 344,770"
              style={{ fill: glowHex, filter: `drop-shadow(0 0 6px ${glowHex})` }}
            />
            <polygon
              points="320,785 336,795 336,815 320,825 304,815 304,795"
              style={{ fill: glowHex, filter: `drop-shadow(0 0 6px ${glowHex})` }}
            />
            <polygon
              points="400,785 416,795 416,815 400,825 384,815 384,795"
              style={{ fill: glowHex, filter: `drop-shadow(0 0 6px ${glowHex})` }}
            />
            <polygon
              points="360,830 376,840 376,860 360,870 344,860 344,840"
              style={{ fill: glowHex, filter: `drop-shadow(0 0 6px ${glowHex})` }}
            />
            <polygon
              points="280,810 296,820 296,840 280,850 264,840 264,820"
              style={{ fill: glowHex, filter: `drop-shadow(0 0 6px ${glowHex})` }}
            />
            <polygon
              points="440,810 456,820 456,840 440,850 424,840 424,820"
              style={{ fill: glowHex, filter: `drop-shadow(0 0 6px ${glowHex})` }}
            />
            <polygon
              points="320,875 336,885 336,905 320,915 304,905 304,885"
              style={{ fill: glowHex, filter: `drop-shadow(0 0 6px ${glowHex})` }}
            />
            <polygon
              points="400,875 416,885 416,905 400,915 384,905 384,885"
              style={{ fill: glowHex, filter: `drop-shadow(0 0 6px ${glowHex})` }}
            />
            <polygon
              points="360,920 376,930 376,950 360,960 344,950 344,930"
              style={{ fill: glowHex, filter: `drop-shadow(0 0 6px ${glowHex})` }}
            />
          </g>

        </svg>

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
