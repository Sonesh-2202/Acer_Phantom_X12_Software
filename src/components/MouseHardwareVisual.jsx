import React from 'react';

export function MouseHardwareVisual({
  activeEffect = 0,
  activeColor = '#A3FF12',
  activeDpi = 1200,
  activePolling = 1000,
  battery = 59,
  highlightedButton = null,
  onButtonClick = null,
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

        {/* Interactive SVG Overlay Mapped to Cutouts */}
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

          {/* Interactive Button Click Targets */}
          {/* M1: Left Click */}
          <path
            d="M190 120 Q 320 100 350 220 L 330 400 L 170 380 Z"
            className={`svg-button-target ${highlightedButton === 'M1' ? 'highlighted' : ''}`}
            onClick={() => onButtonClick && onButtonClick('M1')}
          />
          {/* M2: Right Click */}
          <path
            d="M530 120 Q 400 100 370 220 L 390 400 L 550 380 Z"
            className={`svg-button-target ${highlightedButton === 'M2' ? 'highlighted' : ''}`}
            onClick={() => onButtonClick && onButtonClick('M2')}
          />
          {/* M4: Forward Side */}
          <path
            d="M124 510 L 142 510 L 142 555 L 124 555 Z"
            className={`svg-button-target ${highlightedButton === 'M4' ? 'highlighted' : ''}`}
            onClick={() => onButtonClick && onButtonClick('M4')}
          />
          {/* M5: Backward Side */}
          <path
            d="M124 565 L 142 565 L 142 610 L 124 610 Z"
            className={`svg-button-target ${highlightedButton === 'M5' ? 'highlighted' : ''}`}
            onClick={() => onButtonClick && onButtonClick('M5')}
          />
        </svg>

        {/* Floating Telemetry Callout Badges */}
        {showCallouts && (
          <>
            <div className="hud-callout callout-top-left">
              <div className="callout-badge">
                <span className="callout-label">SENSOR SENSITIVITY</span>
                <span className="callout-val">{activeDpi.toLocaleString('en-US')} DPI</span>
              </div>
            </div>

            <div className="hud-callout callout-top-right">
              <div className="callout-badge">
                <span className="callout-label">REPORT RATE</span>
                <span className="callout-val">{activePolling} HZ / {(1000 / activePolling).toFixed(1)} MS</span>
              </div>
            </div>

            <div className="hud-callout callout-bottom-left">
              <div className="callout-badge">
                <span className="callout-label">CHASSIS POWER</span>
                <span className="callout-val">
                  {Number.isFinite(battery) ? `${battery}% BAT` : 'WAITING 0xD0'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
