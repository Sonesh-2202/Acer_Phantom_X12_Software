import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { sound } from '../utils/audio';
import { EFFECTS } from '../utils/webhid';
import { MouseHardwareVisual } from './MouseHardwareVisual';

gsap.registerPlugin(Flip);

export function StudioCockpit({
  connected,
  onConnectToggle,
  onReturnToLanding,
  onApplyEffect,
  battery,
  chargeStatus,
  activeStage,
  activeDpi,
  activePolling,
  stages = [1200, 2400, 3200, 4800, 8000, 12000],
  onSelectStageDpi,
  selectedEffect,
  onSelectEffect,
  activeColor,
  onChangeColor,
  savedScenes,
  onSaveScene,
  onLoadScene,
  onOpenPatronage,
  theme,
  onToggleTheme,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [batteryView, setBatteryView] = useState('both');
  const [speed, setSpeed] = useState(50);
  const [brightness, setBrightness] = useState(75);
  const [animProfile, setAnimProfile] = useState('spectrum');
  const [highlightedButton, setHighlightedButton] = useState(null);
  const [sfxActive, setSfxActive] = useState(true);
  const [hasPendingApply, setHasPendingApply] = useState(false);

  const laserPillRef = useRef(null);
  const dockNavRef = useRef(null);
  const dpiNumberRef = useRef(null);

  // Keyboard shortcuts [1] to [6]
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const keyMap = {
        1: 'overview',
        2: 'lighting',
        3: 'performance',
        4: 'buttons',
        5: 'macros',
        6: 'about',
      };
      if (keyMap[e.key]) {
        switchTab(keyMap[e.key]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  // Tab switching with GSAP Flip sliding laser line indicator
  const switchTab = (tabId) => {
    sound.click();
    setActiveTab(tabId);

    const dock = dockNavRef.current;
    const pill = laserPillRef.current;
    if (dock && pill) {
      const targetBtn = dock.querySelector(`[data-page="${tabId}"]`);
      if (targetBtn) {
        const flipState = Flip.getState(pill);
        pill.style.left = `${targetBtn.offsetLeft}px`;
        pill.style.width = `${targetBtn.offsetWidth}px`;
        Flip.from(flipState, {
          duration: 0.32,
          ease: 'power2.out',
        });
      }
    }
  };

  // Initial laser pill positioning
  useEffect(() => {
    const dock = dockNavRef.current;
    const pill = laserPillRef.current;
    if (dock && pill) {
      const targetBtn = dock.querySelector(`[data-page="${activeTab}"]`);
      if (targetBtn) {
        pill.style.left = `${targetBtn.offsetLeft}px`;
        pill.style.width = `${targetBtn.offsetWidth}px`;
      }
    }
  }, []);

  // Rapid numeric scrambler animation on DPI switch
  const handleStageClick = (dpi, idx) => {
    sound.click();
    if (onSelectStageDpi) onSelectStageDpi(idx + 1);

    if (dpiNumberRef.current) {
      const currentVal = parseInt(dpiNumberRef.current.textContent.replace(/,/g, ''), 10) || 1200;
      const obj = { val: currentVal };
      gsap.to(obj, {
        val: dpi,
        duration: 0.35,
        ease: 'power2.out',
        onUpdate: () => {
          if (dpiNumberRef.current) {
            dpiNumberRef.current.textContent = Math.round(obj.val).toLocaleString('en-US');
          }
        },
      });
    }
  };

  const handleEffectSelect = (effectId) => {
    sound.click();
    setHasPendingApply(true);
    onSelectEffect(effectId);
  };

  const handleApplyClick = () => {
    setHasPendingApply(false);
    onApplyEffect();
  };

  const currentEffectObj = EFFECTS.find((e) => e.id === selectedEffect) || EFFECTS[0];

  return (
    <div className="studio-cockpit active">
      {/* ZONE 1: TOP TELEMETRY BAR (FIXED HEADER) */}
      <header className="cockpit-topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="return-breadcrumb-btn"
            onClick={() => {
              sound.click();
              onReturnToLanding();
            }}
            title="Return to Flagship Product Page"
          >
            <svg viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>PRODUCT PAGE</span>
          </button>

          <div className="studio-emblem-group">
            <svg className="studio-emblem" viewBox="0 0 24 24" fill="none">
              <polygon points="12,2 22,7 22,17 12,22 2,17 2,7" stroke="var(--volt)" strokeWidth="1.8" fill="rgba(163,255,18,0.08)" />
              <path d="M8 12L12 8L16 12L12 16Z" fill="var(--volt)" />
            </svg>
            <div className="studio-emblem-text">
              <span className="studio-title">PHANTOM STUDIO</span>
              <span className="studio-version-tag">BUILD v2.4 // 248A:8266</span>
            </div>
          </div>
        </div>

        {/* Center: Segmented Hardware Dock Navigation with GSAP Flip Laser Pill */}
        <nav ref={dockNavRef} className="hardware-dock-nav" aria-label="Studio Sections">
          <div ref={laserPillRef} className="dock-laser-pill" aria-hidden="true" />
          {[
            { id: 'overview', key: '1', label: 'OVERVIEW' },
            { id: 'lighting', key: '2', label: 'LIGHTING' },
            { id: 'performance', key: '3', label: 'PERFORMANCE' },
            { id: 'buttons', key: '4', label: 'BUTTONS' },
            { id: 'macros', key: '5', label: 'MACROS' },
            { id: 'about', key: '6', label: 'SYSTEM' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              data-page={tab.id}
              onClick={() => switchTab(tab.id)}
            >
              <span className="nav-key">[{tab.key}]</span>
              <span className="nav-title">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Right: Telemetry & Controls */}
        <div className="topbar-right">
          <button
            type="button"
            className={`sfx-toggle-btn ${sfxActive ? 'active' : ''}`}
            onClick={() => {
              const next = !sfxActive;
              setSfxActive(next);
              sound.enabled = next;
              sound.toggle();
            }}
            title="Toggle Tactical Audio Feedback"
          >
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.47 8.47 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707zM9.414 11.888A5.474 5.474 0 0 0 11.025 8a5.475 5.475 0 0 0-1.611-3.888l-.707.707A4.477 4.477 0 0 1 10.025 8a4.477 4.477 0 0 1-1.318 3.181l.707.707zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/>
            </svg>
            <span className="sfx-label">{sfxActive ? 'SFX ON' : 'SFX MUTED'}</span>
          </button>

          <div className="telemetry-chip">
            <span className="chip-dot"></span>
            <span>Polling {activePolling} Hz</span>
          </div>

          <div className={`connection-pill ${connected ? 'connected' : ''}`}>
            <span className="status-led" aria-hidden="true"></span>
            <span>{connected ? '2.4 GHz Connected' : 'Not connected'}</span>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={() => {
              sound.toggle();
              onToggleTheme();
            }}
            aria-label="Switch Theme"
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="3.2"/><path d="M9 1.5v1.8M9 14.7v1.8M1.5 9h1.8M14.7 9h1.8M3.7 3.7l1.3 1.3M13 13l1.3 1.3M14.3 3.7L13 5M5 13l-1.3 1.3"/></svg>
            ) : (
              <svg viewBox="0 0 18 18"><path d="M14.8 11.2A6.3 6.3 0 0 1 6.8 3.2a6.3 6.3 0 1 0 8 8z"/></svg>
            )}
          </button>

          <button
            type="button"
            className={`button ${connected ? 'button-secondary' : 'button-primary'}`}
            onClick={() => {
              sound.toggle();
              onConnectToggle();
            }}
          >
            {connected ? 'DISCONNECT' : '<span>＋</span> Connect receiver'}
          </button>
        </div>
      </header>

      {/* COCKPIT WORKSPACE CONTAINER (SPLIT 45% / 55%) */}
      <div className="cockpit-workspace">

        {/* ZONE 2: STICKY INTERACTIVE HARDWARE STAGE (45%) */}
        <aside className="hardware-sticky-stage">
          <div className="stage-cad-cross cross-tl">+</div>
          <div className="stage-cad-cross cross-tr">+</div>
          <div className="stage-cad-cross cross-bl">+</div>
          <div className="stage-cad-cross cross-br">+</div>

          <div className="stage-header-telemetry">
            <div className="telemetry-block">
              <span className="meta-label">DEVICE IDENTIFIER</span>
              <span className="meta-val">Acer Phantom X12</span>
              <span className="meta-sub">
                {connected ? 'Connected via 2.4 GHz USB Link' : 'Waiting for receiver'}
              </span>
            </div>
            <div className="telemetry-block align-right">
              <span className="meta-label">FIRMWARE LINK</span>
              <span className="meta-val mono">
                {connected ? 'Receiver 1000Hz' : 'Receiver not connected'}
              </span>
              <span className="meta-sub">2.4 GHz Tri-Mode HID</span>
            </div>
          </div>

          <div className="mouse-stage-viewport">
            <MouseHardwareVisual
              activeEffect={selectedEffect}
              activeColor={activeColor}
              activeDpi={activeDpi}
              activePolling={activePolling}
              battery={battery}
              highlightedButton={highlightedButton}
              onButtonClick={(btn) => {
                sound.click();
                setHighlightedButton(btn);
                setTimeout(() => setHighlightedButton(null), 1200);
              }}
              imgClassName="w-[280px] h-[480px]"
            />
          </div>

          <div className="stage-footer-telemetry">
            <div className="footer-effect-preview">
              <span className="pipe-slot" aria-hidden="true">
                <i className="mouse-led" style={{ background: activeColor }}></i>
              </span>
              <div className="effect-text">
                <span className="meta-label">ACTIVE CHROMA EFFECT</span>
                <span className="meta-val">{currentEffectObj.name}</span>
              </div>
            </div>
            <div className="hud-stage-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </aside>

        {/* ZONE 3: RIGHT CONTROL DECK (55% — LENIS SMOOTH SCROLLER) */}
        <main className="control-deck-scroller">
          <div className="control-deck-inner">

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <section className="page active">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">TACTICAL TELEMETRY</p>
                    <h1>PHANTOM X12 COCKPIT</h1>
                    <p className="subheading">Direct bidirectional telemetry streamed from the 2.4&nbsp;GHz receiver.</p>
                  </div>
                </div>

                <div className="tactical-modules-grid">
                  {/* Module 1: 20-Cell Battery Array */}
                  <article className="panel reading-block">
                    <div className="reading-head">
                      <div className="panel-header-title">
                        <span className="panel-icon-dot"></span>
                        <h2 className="panel-title">CHASSIS POWER ARRAY</h2>
                      </div>
                      <div className="battery-view-toggle">
                        {['both', 'percent', 'bar'].map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            className={batteryView === mode ? 'active' : ''}
                            onClick={() => {
                              sound.click();
                              setBatteryView(mode);
                            }}
                          >
                            {mode.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(batteryView === 'both' || batteryView === 'percent') && (
                      <div className="battery-main-display">
                        <div className="battery-numeric-readout">
                          <strong>{battery}</strong>
                          <span>%</span>
                        </div>
                        <div className="battery-spec-meta">
                          <span className="meta-item"><span className="k">VOLTAGE:</span> <span className="v">3.7V LI-ION</span></span>
                          <span className="meta-item"><span className="k">STATE:</span> <span className="v">{chargeStatus}</span></span>
                          <span className="meta-item"><span className="k">EST. RUNTIME:</span> <span className="v">~48 HOURS</span></span>
                        </div>
                      </div>
                    )}

                    {(batteryView === 'both' || batteryView === 'bar') && (
                      <div className="battery-cell-array">
                        {Array.from({ length: 20 }).map((_, idx) => {
                          const fillCount = Math.round((battery / 100) * 20);
                          const isFilled = idx < fillCount;
                          const isDanger = battery <= 20;
                          const isWarn = battery > 20 && battery <= 40;
                          return (
                            <div
                              key={idx}
                              className={`battery-cell ${isFilled ? 'filled' : ''} ${isDanger ? 'danger' : ''} ${isWarn ? 'warn' : ''}`}
                            />
                          );
                        })}
                      </div>
                    )}

                    <p className="panel-foot">
                      <span>{connected ? 'Unsolicited 0xD0 streaming live' : 'Connect 2.4 GHz receiver to read live reports'}</span>
                      <span className="mono-badge">STREAMING D0</span>
                    </p>
                  </article>

                  {/* Module 2: Active Sensitivity (DPI) Quick-Selector */}
                  <article className="panel reading-block">
                    <div className="reading-head">
                      <div className="panel-header-title">
                        <span className="panel-icon-dot"></span>
                        <h2 className="panel-title">ACTIVE SENSITIVITY (DPI)</h2>
                      </div>
                      <span className="stage-tag">Active stage {activeStage}</span>
                    </div>

                    <div className="dpi-main-display">
                      <div className="dpi-big-number">
                        <strong ref={dpiNumberRef}>{activeDpi.toLocaleString('en-US')}</strong>
                        <span className="unit">DPI</span>
                      </div>
                      <div className="dpi-aux-meta">
                        <span className="meta-label">OPTICAL TRACKER</span>
                        <span className="meta-val">1:1 NATIVE HARDWARE ACCEL: OFF</span>
                      </div>
                    </div>

                    {/* 6 Interlocking Angled Hardware Paddles */}
                    <div className="dpi-paddle-rack">
                      {stages.map((dpi, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`dpi-stage ${idx + 1 === activeStage ? 'active' : ''}`}
                          onClick={() => handleStageClick(dpi, idx)}
                        >
                          <span>{dpi.toLocaleString('en-US')}</span>
                        </button>
                      ))}
                    </div>

                    <p className="panel-foot">
                      <span>Click stage paddle for instant scrambler switch</span>
                      <span className="mono-badge">CMD 0x0E</span>
                    </p>
                  </article>

                  {/* Module 3: Active Effect Telemetry Card */}
                  <article className="panel reading-block">
                    <div className="reading-head">
                      <div className="panel-header-title">
                        <span className="panel-icon-dot"></span>
                        <h2 className="panel-title">CHROMA MATRIX EFFECT</h2>
                      </div>
                      <button type="button" className="action-link-btn" onClick={() => switchTab('lighting')}>
                        OPEN LIGHTING STUDIO →
                      </button>
                    </div>

                    <div className="effect-telemetry-row">
                      <div className="effect-visual-preview">
                        <span className="pipe-slot" aria-hidden="true">
                          <i className="mouse-led" style={{ background: activeColor }}></i>
                        </span>
                      </div>
                      <div className="effect-desc-block">
                        <strong className="effect-name-large">{currentEffectObj.name}</strong>
                        <p className="effect-notes">{currentEffectObj.pattern}</p>
                      </div>
                    </div>
                  </article>
                </div>

                {/* Live Diagnostic Terminal Matrix */}
                <div className="diagnostic-terminal-block">
                  <div className="terminal-header">
                    <div className="terminal-title-group">
                      <span className="terminal-prompt">&gt;</span>
                      <h3 className="terminal-title">LIVE FIRMWARE DIAGNOSTIC TERMINAL // AUDIT MATRIX</h3>
                    </div>
                    <div className="terminal-tags">
                      <span className="terminal-tag">YJX-CHIP A8A5:2255</span>
                      <span className="terminal-tag">VID:0x248A PID:0x8266</span>
                    </div>
                  </div>

                  <div className="table-scroll" tabIndex={0} role="region">
                    <table className="capability-table tactical-table">
                      <thead>
                        <tr>
                          <th scope="col">HID ENDPOINT / CAPABILITY</th>
                          <th scope="col">2.4 GHz RECEIVER</th>
                          <th scope="col">WIRED / BLUETOOTH</th>
                          <th scope="col">AUDIT STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <th scope="row">
                            <span className="ep-name">Receiver Identity &amp; Firmware Text</span>
                            <code className="ep-hex">CMD 0x03 -&gt; RESP 0xAA 0x03</code>
                          </th>
                          <td>Read verified</td>
                          <td>Not enumerated</td>
                          <td><span className="tag tag-ok">VERIFIED</span></td>
                        </tr>
                        <tr>
                          <th scope="row">
                            <span className="ep-name">Battery Level Streaming</span>
                            <code className="ep-hex">UNSOLICITED 0xFA [0xD0]</code>
                          </th>
                          <td>Streaming live events</td>
                          <td>Unknown</td>
                          <td><span className="tag tag-live">LIVE</span></td>
                        </tr>
                        <tr>
                          <th scope="row">
                            <span className="ep-name">Active DPI Stage + 6 Values</span>
                            <code className="ep-hex">CMD 0x0E -&gt; RESP 0xAA 0x0E</code>
                          </th>
                          <td>Read verified (1200-12000)</td>
                          <td>Not enumerated</td>
                          <td><span className="tag tag-ok">VERIFIED</span></td>
                        </tr>
                        <tr>
                          <th scope="row">
                            <span className="ep-name">Polling Rate Report (1000 Hz)</span>
                            <code className="ep-hex">OFFSET 10 IN PROFILE</code>
                          </th>
                          <td>Reads 1000 Hz</td>
                          <td>Not enumerated</td>
                          <td><span className="tag tag-ok">VERIFIED</span></td>
                        </tr>
                        <tr>
                          <th scope="row">
                            <span className="ep-name">Lighting Effects (7 Modes)</span>
                            <code className="ep-hex">CMD 0x21 [MODE_BYTE]</code>
                          </th>
                          <td>Confirmed on physical hardware</td>
                          <td>Unknown</td>
                          <td><span className="tag tag-ok">VERIFIED</span></td>
                        </tr>
                        <tr>
                          <th scope="row">
                            <span className="ep-name">DPI &amp; Polling Writes</span>
                            <code className="ep-hex">VENDOR PAGE PROFILE WRITE</code>
                          </th>
                          <td>Packet shape captured</td>
                          <td>Not enumerated</td>
                          <td><span className="tag tag-read">READ-ONLY (LOCKED)</span></td>
                        </tr>
                        <tr>
                          <th scope="row">
                            <span className="ep-name">Custom RGB Color Stream</span>
                            <code className="ep-hex">COLOR BYTE PAYLOAD UNKNOWN</code>
                          </th>
                          <td>Color packet in study</td>
                          <td>Unknown</td>
                          <td><span className="tag tag-wip">CAPTURE NEEDED</span></td>
                        </tr>
                        <tr>
                          <th scope="row">
                            <span className="ep-name">Button Mapping &amp; Macros</span>
                            <code className="ep-hex">VENDOR PAGE CHUNKS</code>
                          </th>
                          <td>Traffic captured, semantics unmapped</td>
                          <td>Unknown</td>
                          <td><span className="tag tag-wip">CAPTURE NEEDED</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="terminal-footer">
                    <span className="terminal-foot-text">
                      “Not enumerated” indicates mode has not been hooked to the physical USB sniffer yet.
                    </span>
                    <span className="terminal-foot-status">
                      {connected ? 'WebHID · 2.4GHz Connected' : 'WebHID · Disconnected'}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* TAB 2: LIGHTING */}
            {activeTab === 'lighting' && (
              <section className="page active">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">CHROMA MATRIX &amp; CUSTOM FORGE</p>
                    <h1>LIGHTING STUDIO</h1>
                    <p className="subheading">Seven onboard modes decoded from physical device observation.</p>
                  </div>
                  <div className="aircraft-toggle-box">
                    <span className="toggle-label">ON-DEVICE LIGHTING</span>
                    <div className="toggle-switch-housing">
                      <div className="switch-diode active"></div>
                      <span className="switch-status">{connected ? 'Connected · 2.4 GHz Link' : 'Connect receiver to apply'}</span>
                    </div>
                  </div>
                </div>

                <div className="lighting-layout-grid">
                  {/* Built-in Effects 2x3 Grid */}
                  <article className="panel modes-panel">
                    <div className="section-heading inline">
                      <div>
                        <p className="eyebrow">ONBOARD PRESETS</p>
                        <h2>CHROMA MODES</h2>
                      </div>
                      <span className="count-pill">7 MODES AUDITED</span>
                    </div>

                    <div className="mode-grid-tactical">
                      {EFFECTS.map((eff) => (
                        <button
                          key={eff.id}
                          type="button"
                          className={`mode-card ${selectedEffect === eff.id ? 'selected' : ''}`}
                          onClick={() => handleEffectSelect(eff.id)}
                        >
                          <div className="mode-card-top">
                            <span className="mode-cmd">0x0{eff.cmd}</span>
                            <span className={`mode-light-bar bar-${eff.name.split(' ')[1]?.toLowerCase() || 'aurora'}`}></span>
                          </div>
                          <div className="mode-copy">
                            <b>{eff.name}</b>
                            <small>{eff.pattern}</small>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="mode-footer-terminal">
                      <div className="terminal-raw-payload">
                        <span className="payload-label">REPORT 0x21 PAYLOAD:</span>
                        <code className="payload-hex">55 21 00 00 03 00 00 00 00 00 0{selectedEffect} ...</code>
                      </div>
                      <span className="mode-note-text">
                        Selected: {currentEffectObj.name} · cmd 0x0{currentEffectObj.cmd}
                      </span>
                      <button
                        type="button"
                        className={`btn-transmit-pulse ${hasPendingApply ? 'pulse-ready' : ''}`}
                        disabled={!connected}
                        onClick={handleApplyClick}
                      >
                        <span className="transmit-icon">⚡</span>
                        <span>TRANSMIT TO HARDWARE (APPLY)</span>
                      </button>
                    </div>
                  </article>

                  {/* Precision Color Forge */}
                  <article className="panel creator-panel">
                    <div className="section-heading inline">
                      <div>
                        <p className="eyebrow">PRECISION FORGE</p>
                        <h2>CUSTOM COLOR SCULPTOR</h2>
                      </div>
                      <span className="status-tag experimental-tag">LOCAL PREVIEW (DEVICE WRITE IN STUDY)</span>
                    </div>

                    <div className="creator-layout-split">
                      <div className="color-preview-stage">
                        <div
                          className="color-preview-reticle"
                          style={{
                            background: activeColor,
                            filter: `brightness(${0.3 + brightness / 120}) drop-shadow(0 0 20px ${activeColor})`,
                          }}
                        >
                          <div className="reticle-crosshair"></div>
                        </div>
                        <p className="preview-caption">
                          <span className="live-dot" aria-hidden="true"></span>
                          LIVE SHADER PREVIEW // 60 FPS
                        </p>
                      </div>

                      <div className="creator-controls-column">
                        <label className="control-label">HEX SPECTRUM PICKER</label>
                        <div className="color-input-row">
                          <div className="picker-swatch-wrap">
                            <input
                              type="color"
                              value={activeColor}
                              onChange={(e) => onChangeColor(e.target.value)}
                            />
                          </div>
                          <input
                            type="text"
                            value={activeColor.toUpperCase()}
                            maxLength={7}
                            onChange={(e) => {
                              if (/^#[0-9a-f]{6}$/i.test(e.target.value)) {
                                onChangeColor(e.target.value);
                              }
                            }}
                            className="tactical-hex-input"
                          />
                        </div>

                        {/* Tactile Swatch Pills */}
                        <div className="preset-colors-row">
                          {['#a3ff12', '#45e8ff', '#8b5cff', '#ff16a6', '#ffb800', '#ffffff'].map((c) => (
                            <button
                              key={c}
                              type="button"
                              className="swatch-pill"
                              style={{ '--swatch': c }}
                              onClick={() => {
                                sound.click();
                                onChangeColor(c);
                              }}
                            />
                          ))}
                        </div>

                        <label className="control-label">ANIMATION PROFILE</label>
                        <select
                          className="tactical-select"
                          value={animProfile}
                          onChange={(e) => {
                            sound.click();
                            setAnimProfile(e.target.value);
                          }}
                        >
                          <option value="spectrum">Spectrum Flow (360° Wave)</option>
                          <option value="breathing">Breathing Glow (Slow Sine)</option>
                          <option value="pulse">Tactical Pulse (Strobe)</option>
                          <option value="solid">Static Color (Steady)</option>
                        </select>

                        <div className="fader-group">
                          <div className="fader-label-row">
                            <span>CYCLE SPEED</span>
                            <b className="mono">{speed}%</b>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={speed}
                            className="tactical-fader"
                            onChange={(e) => {
                              sound.slider();
                              setSpeed(Number(e.target.value));
                            }}
                          />
                        </div>

                        <div className="fader-group">
                          <div className="fader-label-row">
                            <span>LED BRIGHTNESS</span>
                            <b className="mono">{brightness}%</b>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={brightness}
                            className="tactical-fader"
                            onChange={(e) => {
                              sound.slider();
                              setBrightness(Number(e.target.value));
                            }}
                          />
                        </div>

                        <div className="creator-actions-deck">
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => {
                              sound.ack();
                              onSaveScene({
                                name: `Scene ${savedScenes.length + 1}`,
                                color: activeColor,
                                speed,
                                brightness,
                                profile: animProfile,
                              });
                            }}
                          >
                            SAVE SCENE LOCALLY
                          </button>
                        </div>

                        <p className="hardware-note">
                          <span aria-hidden="true">ⓘ</span> 
                          Scenes persist in browser storage. Multi-stop color packets are under active protocol study.
                        </p>
                      </div>
                    </div>

                    {/* Saved Scenes */}
                    <div className="saved-scenes-deck mt-6">
                      <div className="saved-scenes-head mb-3">
                        <b>LOCAL SCENE PRESETS</b>
                        <small className="text-muted block text-xs">Stored in browser localStorage</small>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {savedScenes.length === 0 ? (
                          <span className="text-xs text-muted">No saved scenes. Customize and save above.</span>
                        ) : (
                          savedScenes.map((sc, i) => (
                            <button
                              key={i}
                              type="button"
                              className="plate-chip"
                              onClick={() => {
                                sound.click();
                                onLoadScene(sc);
                              }}
                            >
                              <b style={{ color: sc.color }}>● {sc.name}</b>
                              <small>{sc.profile || 'spectrum'} · {sc.speed}%</small>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </article>
                </div>
              </section>
            )}

            {/* TAB 3: PERFORMANCE */}
            {activeTab === 'performance' && (
              <section className="page active">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">SENSOR &amp; POLLING CALIBRATION</p>
                    <h1>PERFORMANCE RACK</h1>
                    <p className="subheading">Six configurable sensitivity stages (200 to 12,000 DPI) and hardware polling rate calibration.</p>
                  </div>
                </div>

                <div className="perf-layout-grid">
                  <article className="panel perf-panel">
                    <div className="section-heading inline">
                      <div>
                        <p className="eyebrow">PRECISION TELEMETRY RACK</p>
                        <h2>6-STAGE DPI EQUALIZER</h2>
                      </div>
                      <span className="mono-badge">
                        {connected ? 'Read verified (CMD 0x0E)' : 'Connect to read'}
                      </span>
                    </div>

                    <div className="dpi-equalizer-rack">
                      {stages.map((dpi, idx) => (
                        <div
                          key={idx}
                          className={`dpi-row ${idx + 1 === activeStage ? 'active' : ''}`}
                        >
                          <label>STAGE {idx + 1}</label>
                          <input
                            type="range"
                            min="200"
                            max="12000"
                            step="100"
                            value={dpi}
                            disabled
                          />
                          <output className="mono">{dpi.toLocaleString('en-US')} DPI</output>
                        </div>
                      ))}
                    </div>

                    <div className="poll-calibration-deck">
                      <div className="range-label">
                        <span>RECEIVER POLLING FREQUENCY</span>
                        <b className="mono">{activePolling} Hz</b>
                      </div>

                      <div className="poll-switches-rack">
                        {[
                          { hz: 125, ms: '8.0 ms' },
                          { hz: 250, ms: '4.0 ms' },
                          { hz: 500, ms: '2.0 ms' },
                          { hz: 1000, ms: '1.0 ms' },
                        ].map((p) => (
                          <button
                            key={p.hz}
                            type="button"
                            className={`poll-switch ${activePolling === p.hz ? 'active' : ''}`}
                            onClick={() => sound.click()}
                          >
                            <span className="poll-hz">{p.hz} Hz</span>
                            <span className="poll-ms">{p.ms}</span>
                          </button>
                        ))}
                      </div>

                      <p className="hardware-note">
                        <span aria-hidden="true">ⓘ</span> 
                        Reading is 100% verified. Applying DPI and polling edits unlocks after profile checksum write rules are fully confirmed.
                      </p>
                    </div>
                  </article>

                  <aside className="panel write-status-panel">
                    <p className="eyebrow">WRITE SAFETY AUDIT</p>
                    <h2>COMMAND PERMISSIONS</h2>
                    <ul className="fact-list tactical-fact-list">
                      <li>
                        <code>55 0E</code>
                        <span>DPI profile read — <b className="volt-text">VERIFIED &amp; LIVE</b></span>
                      </li>
                      <li>
                        <code>55 03</code>
                        <span>Receiver query — <b className="volt-text">VERIFIED &amp; LIVE</b></span>
                      </li>
                      <li>
                        <code>55 21</code>
                        <span>Lighting mode write — <b className="volt-text">VERIFIED &amp; LIVE</b></span>
                      </li>
                      <li>
                        <code>vendor page</code>
                        <span>DPI / polling writes — <b className="amber-text">CAPTURED, READ-ONLY</b></span>
                      </li>
                    </ul>
                    <p className="muted-copy">
                      Writes are only enabled once their bidirectional reply is confirmed on physical hardware to prevent unrecoverable device states.
                    </p>
                  </aside>
                </div>
              </section>
            )}

            {/* TAB 4: BUTTONS */}
            {activeTab === 'buttons' && (
              <section className="page active">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">LOCKED HARDWARE MODULE // PROTOCOL DIAGNOSTICS</p>
                    <h1>BUTTON REMAPPING</h1>
                    <p className="subheading">The onboard button mapping matrix is intentionally gated pending packet verification.</p>
                  </div>
                </div>

                <div className="split-layout-tactical">
                  <article className="panel blueprint-panel">
                    <p className="eyebrow">PHYSICAL SWITCH BLUEPRINT</p>
                    <h2>PHANTOM X12 LAYOUT (M1 - M6)</h2>

                    <div className="button-blueprint-visual">
                      {[
                        { id: 'M1', name: 'LEFT CLICK', status: 'MICROSWITCH 80M' },
                        { id: 'M2', name: 'RIGHT CLICK', status: 'MICROSWITCH 80M' },
                        { id: 'M3', name: 'SCROLL WHEEL', status: 'TACTILE ENCODER' },
                        { id: 'M4', name: 'FORWARD SIDE', status: 'CAPTURED' },
                        { id: 'M5', name: 'BACKWARD SIDE', status: 'CAPTURED' },
                        { id: 'M6', name: 'DPI CYCLE', status: 'STREAMING AE' },
                      ].map((btn) => (
                        <div
                          key={btn.id}
                          className="button-chip"
                          onMouseEnter={() => setHighlightedButton(btn.id)}
                          onMouseLeave={() => setHighlightedButton(null)}
                          onClick={() => {
                            sound.click();
                            setHighlightedButton(btn.id);
                          }}
                        >
                          <span className="btn-num">{btn.id}</span>
                          <span className="btn-name">{btn.name}</span>
                          <span className="btn-status">{btn.status}</span>
                        </div>
                      ))}
                    </div>

                    <p className="muted-copy">
                      Hovering any button highlights its target region on the physical hardware visualizer. Writing unverified bytes could corrupt the physical switch mapping table.
                    </p>
                  </article>

                  <aside className="panel capture-panel">
                    <p className="eyebrow">CAPTURE LOG &amp; ARTIFACTS</p>
                    <ul className="fact-list tactical-fact-list">
                      <li><code>source</code><span>K-Snake X11 vendor configurator</span></li>
                      <li><code>logger</code><span>tools/webhid_capture.js (passive)</span></li>
                      <li><code>artifact</code><span>tools/hid-capture.json</span></li>
                      <li><code>rule</code><span>Never issue factory reset or unverified apply</span></li>
                    </ul>
                    <a
                      href="https://github.com/sonesh-2202/Acer_Phantom_X12_Software/blob/main/docs/webhid_capture_instructions.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-link-action"
                    >
                      VIEW FULL PROTOCOL REPO →
                    </a>
                  </aside>
                </div>
              </section>
            )}

            {/* TAB 5: MACROS */}
            {activeTab === 'macros' && (
              <section className="page active">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">LOCKED HARDWARE MODULE // PROTOCOL DIAGNOSTICS</p>
                    <h1>MACRO ENGINE</h1>
                    <p className="subheading">Hardware macro upload is paused while the multi-chunk fragmentation protocol is mapped.</p>
                  </div>
                </div>

                <div className="narrow-column-tactical">
                  <article className="panel">
                    <p className="eyebrow">PROTOCOL UNLOCK CHECKLIST</p>
                    <h2>REVERSE-ENGINEERING REQUIREMENTS</h2>

                    <div className="checklist-grid">
                      <div className="check-item done">
                        <div className="check-icon">✓</div>
                        <div className="check-text">
                          <b>01. Chunk Format Decoded</b>
                          <span>Receiver multi-byte fragmentation boundaries mapped.</span>
                        </div>
                      </div>

                      <div className="check-item pending">
                        <div className="check-icon">⋯</div>
                        <div className="check-text">
                          <b>02. Save Behavior Confirmed</b>
                          <span>Validating whether macro survived reboot without EEPROM wear.</span>
                        </div>
                      </div>

                      <div className="check-item pending">
                        <div className="check-icon">⋯</div>
                        <div className="check-text">
                          <b>03. Explicit Send &amp; Confirmation</b>
                          <span>Deliberate user confirmation step required before device write.</span>
                        </div>
                      </div>

                      <div className="check-item pending">
                        <div className="check-icon">⋯</div>
                        <div className="check-text">
                          <b>04. Physical Hardware Verification</b>
                          <span>Timing and keystroke replays validated on real device.</span>
                        </div>
                      </div>
                    </div>

                    <p className="muted-copy">
                      Local macro serialization is already implemented in Python (<code>services/macros.py</code>). Device hardware sync will unlock upon protocol validation.
                    </p>
                  </article>
                </div>
              </section>
            )}

            {/* TAB 6: ABOUT */}
            {activeTab === 'about' && (
              <section className="page active">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">ENGINEERING SPEC PLATE</p>
                    <h1>SYSTEM &amp; CREDITS</h1>
                    <p className="subheading">Laser-etched hardware specifications and developer links.</p>
                  </div>
                </div>

                <div className="about-spec-plate">
                  <div className="spec-plate-inner">
                    <div className="spec-plate-header">
                      <div className="plate-title">ACER PHANTOM X12 // TACTICAL WEBHID SUITE</div>
                      <div className="plate-serial">SER: PX12-248A-8266-REV2</div>
                    </div>

                    <div className="plate-grid">
                      <div className="plate-cell">
                        <span className="pk">HARDWARE VID:PID</span>
                        <span className="pv mono">0x248A : 0x8266 (YJX 0xA8A5:0x2255)</span>
                      </div>
                      <div className="plate-cell">
                        <span className="pk">TRANSPORT LAYER</span>
                        <span className="pv mono">Chromium WebHID API / 64-byte chunks</span>
                      </div>
                      <div className="plate-cell">
                        <span className="pk">OPTICAL ENGINE</span>
                        <span className="pv mono">12,000 DPI / 1000Hz (1.0ms) Polling</span>
                      </div>
                      <div className="plate-cell">
                        <span className="pk">PROJECT LICENSE</span>
                        <span className="pv mono">Open Source / MIT / Public Domain Research</span>
                      </div>
                    </div>

                    <div className="plate-bio-section">
                      <span className="pk">DEVELOPER STATEMENT</span>
                      <p className="plate-bio-text">
                        Engineered to eliminate bulky OEM background bloatware and return hardware ownership directly to the user. Built with love for gaming hardware, clean code, and zero background telemetry.
                      </p>
                    </div>

                    <div className="plate-social-links">
                      <a
                        href="https://github.com/sonesh-2202/Acer_Phantom_X12_Software"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="plate-chip"
                        onClick={() => sound.click()}
                      >
                        <b>GitHub</b>
                        <small>sonesh-2202</small>
                      </a>
                      <a
                        href="https://github.com/sonesh-2202/Acer_Phantom_X12_Software/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="plate-chip"
                        onClick={() => sound.click()}
                      >
                        <b>Discord &amp; Issues</b>
                        <small>Join research chat</small>
                      </a>
                      <button
                        type="button"
                        className="plate-chip"
                        onClick={() => {
                          sound.click();
                          onOpenPatronage();
                        }}
                      >
                        <b>Support Dev</b>
                        <small>Fund hardware tests</small>
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
