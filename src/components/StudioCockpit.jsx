import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { sound } from '../utils/audio';
import {
  EFFECTS,
  POLLING,
  DPI_MIN,
  DPI_MAX,
  DPI_STEP,
  clampDpi,
} from '../utils/webhid';
import { MouseHardwareVisual } from './MouseHardwareVisual';

gsap.registerPlugin(Flip);

export function StudioCockpit({
  connected,
  controlConnected = connected,
  controlMode = 'receiver',
  onConnectToggle,
  wiredConnected = false,
  onConnectWired,
  onDisconnectWired,
  bluetoothConnected = false,
  onConnectBluetooth,
  onDisconnectBluetooth,
  bluetoothHidConnected = false,
  onConnectBluetoothHid,
  onDisconnectBluetoothHid,
  onReturnToLanding,
  battery,
  chargeStatus,
  batteryTelemetryStatus = 'unavailable',
  // Performance
  activeStage,
  activeDpi,
  activePolling,
  stages = [1200, 2400, 3200, 4800, 6400, 12000],
  hardwareProfile,
  isApplyingProfile = false,
  onChangeActiveStage,
  onChangeStageDpi,
  onSetAllStages,
  onChangePollingRate,
  onApplyProfileToHardware,
  // Lighting
  selectedEffect,
  onSelectEffect,
  activeColor,
  onApplyEffect,
  isApplyingLighting = false,
  // Profiles & Restore
  profiles = [],
  activeProfileId = 'default',
  onSaveProfile,
  onLoadProfile,
  onDeleteProfile,
  onExportProfile,
  onImportProfile,
  onRestoreKnownGoodBaseline,
  // Theme
  theme,
  onToggleTheme,
}) {
  const [activeTab, setActiveTab] = useState(() => window.location.hash === '#about' ? 'about' : 'overview');
  const [sfxActive, setSfxActive] = useState(true);
  const [hasPendingLighting, setHasPendingLighting] = useState(false);
  const [upiCopied, setUpiCopied] = useState(false);

  // New profile name input state
  const [newProfileName, setNewProfileName] = useState('');

  const laserPillRef = useRef(null);
  const dockNavRef = useRef(null);
  const fileInputRef = useRef(null);

  // Keyboard navigation [1] to [5]
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      const keyMap = {
        1: 'overview',
        2: 'lighting',
        3: 'performance',
        4: 'profiles',
        5: 'about',
      };
      if (keyMap[e.key]) {
        switchTab(keyMap[e.key]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  // Tab switching with sliding GSAP Flip indicator
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

  // Check if current UI profile has pending differences from hardware
  const hasPendingProfileChanges = (() => {
    if (!hardwareProfile) return false;
    if (hardwareProfile.activeStage !== activeStage) return true;
    if (hardwareProfile.pollingRate !== activePolling) return true;
    if (!hardwareProfile.stages || hardwareProfile.stages.length !== stages.length) return true;
    return stages.some((val, idx) => val !== hardwareProfile.stages[idx]);
  })();

  // The active stage is the source of truth for the displayed DPI.
  const handleStageClick = (idx) => {
    sound.click();
    if (onChangeActiveStage) onChangeActiveStage(idx + 1);
  };

  const handleEffectSelect = (effectId) => {
    sound.click();
    setHasPendingLighting(true);
    onSelectEffect(effectId);
  };

  const handleApplyLightingClick = () => {
    setHasPendingLighting(false);
    onApplyEffect(selectedEffect);
  };

  const currentEffectObj = EFFECTS.find((e) => e.id === selectedEffect) || EFFECTS[0];
  const selectedDpi = stages[activeStage - 1] ?? activeDpi;

  return (
    <div className="studio-cockpit active">
      {/* ZONE 1: TOP TELEMETRY BAR */}
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
              <span className="studio-version-tag">DEVICE READY</span>
            </div>
          </div>
        </div>

        {/* Center: Segmented Hardware Dock Navigation */}
        <nav ref={dockNavRef} className="hardware-dock-nav" aria-label="Studio Sections">
          <div ref={laserPillRef} className="dock-laser-pill" aria-hidden="true" />
          {[
            { id: 'overview', key: '1', label: 'OVERVIEW' },
            { id: 'lighting', key: '2', label: 'LIGHTING' },
            { id: 'performance', key: '3', label: 'PERFORMANCE' },
            { id: 'profiles', key: '4', label: 'PROFILES' },
            { id: 'about', key: '5', label: 'SYSTEM' },
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
          <div className="topbar-telemetry-group">
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
                <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.47 8.47 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707zM9.414 11.888A5.474 5.474 0 0 0 11.025 8a5.475 5.475 0 0 0-1.611-3.888l-.707.707A4.477 4.477 0 0 1 10.025 8a4.477 4.477 0 0 1-1.318 3.181l.707.707zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z" />
              </svg>
              <span className="sfx-label">{sfxActive ? 'SFX ON' : 'SFX MUTED'}</span>
            </button>

            <div className="telemetry-chip">
              <span className="chip-dot"></span>
              <span>Polling {activePolling} Hz</span>
            </div>

            <div className={`connection-pill ${connected || wiredConnected || bluetoothConnected || bluetoothHidConnected ? 'connected' : ''}`}>
              <span className="status-led" aria-hidden="true"></span>
              <span>{connected ? '2.4 GHz Connected' : wiredConnected ? 'Wired Control Link' : bluetoothHidConnected ? 'Bluetooth HID Control' : bluetoothConnected ? 'Bluetooth Battery Link' : 'Not connected'}</span>
            </div>

            <button
              type="button"
              className="icon-button theme-toggle"
              onClick={() => {
                sound.toggle();
                onToggleTheme();
              }}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={theme === 'light'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="3.2"/><path d="M9 1.5v1.8M9 14.7v1.8M1.5 9h1.8M14.7 9h1.8M3.7 3.7l1.3 1.3M13 13l1.3 1.3M14.3 3.7L13 5M5 13l-1.3 1.3"/></svg>
              ) : (
                <svg viewBox="0 0 18 18"><path d="M14.8 11.2A6.3 6.3 0 0 1 6.8 3.2a6.3 6.3 0 1 0 8 8z"/></svg>
              )}
            </button>
          </div>

          <div className="topbar-connection-actions">
            <button
              type="button"
              className={`button ${wiredConnected ? 'button-disconnect' : 'button-connect'}`}
              onClick={() => wiredConnected ? onDisconnectWired?.() : onConnectWired?.()}
              disabled={!wiredConnected && !onConnectWired}
            >
              {wiredConnected ? 'DISCONNECT WIRED' : 'CONNECT WIRED'}
            </button>

            <div className="bluetooth-connection-group" role="group" aria-label="Bluetooth connections">
              <span className="bluetooth-group-label">BLUETOOTH</span>
              <button
                type="button"
                className={`button ${bluetoothHidConnected ? 'button-disconnect' : 'button-connect'}`}
                onClick={() => bluetoothHidConnected ? onDisconnectBluetoothHid?.() : onConnectBluetoothHid?.()}
                disabled={!bluetoothHidConnected && !onConnectBluetoothHid}
                aria-label={bluetoothHidConnected ? 'Disconnect Bluetooth control' : 'Connect Bluetooth control'}
                title={bluetoothHidConnected ? 'Disconnect Bluetooth control' : 'Connect Bluetooth control'}
              >
                CONTROL
              </button>
              <button
                type="button"
                className={`button ${bluetoothConnected ? 'button-disconnect' : 'button-connect'}`}
                onClick={() => bluetoothConnected ? onDisconnectBluetooth?.() : onConnectBluetooth?.()}
                disabled={!bluetoothConnected && !onConnectBluetooth}
                aria-label={bluetoothConnected ? 'Disconnect Bluetooth battery' : 'Connect Bluetooth battery'}
                title={bluetoothConnected ? 'Disconnect Bluetooth battery' : 'Connect Bluetooth battery'}
              >
                BATTERY
              </button>
            </div>

            <button
              type="button"
              className={`button ${connected ? 'button-secondary' : 'button-primary'}`}
              onClick={() => {
                sound.toggle();
                onConnectToggle();
              }}
            >
              {connected ? 'DISCONNECT' : <><span aria-hidden="true">＋</span> Connect receiver</>}
            </button>
          </div>
        </div>
      </header>

      {/* COCKPIT WORKSPACE CONTAINER */}
      <div className="cockpit-workspace">
        {/* ZONE 2: STICKY INTERACTIVE HARDWARE STAGE */}
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
                {connected ? 'Connected via 2.4 GHz USB Link' : wiredConnected ? 'Wired HID control link' : bluetoothHidConnected ? 'Bluetooth HID control link' : bluetoothConnected ? 'Bluetooth battery link · telemetry only' : 'Waiting for receiver'}
              </span>
            </div>
            <div className="telemetry-block align-right">
              <span className="meta-label">RECEIVER</span>
              <span className="meta-val mono">
                {connected ? `Receiver ${activePolling}Hz` : 'Receiver not connected'}
              </span>
              <span className="meta-sub">YJX 2.4 GHz WebHID receiver</span>
            </div>
          </div>

          <div className="mouse-stage-viewport">
            <MouseHardwareVisual
              activeEffect={selectedEffect}
              activeColor={activeColor}
              activeDpi={selectedDpi}
              activePolling={activePolling}
              battery={battery}
            />
          </div>

          <div className="stage-footer-telemetry">
            <button
              type="button"
              className="footer-effect-preview"
              title="Click to apply the next lighting effect"
              aria-label={`Current lighting: ${currentEffectObj.name}. Click to apply the next effect.`}
              onClick={() => {
                sound.click();
                const currentIndex = EFFECTS.findIndex((effect) => effect.id === selectedEffect);
                const nextEffect = EFFECTS[(currentIndex + 1) % EFFECTS.length];
                setHasPendingLighting(false);
                onSelectEffect(nextEffect.id);
                onApplyEffect(nextEffect.id);
              }}
            >
              <span className="pipe-slot" aria-hidden="true">
                <i className="mouse-led" style={{ background: activeColor }}></i>
              </span>
              <div className="effect-text">
                <span className="meta-label">LIGHTING MODE · CLICK TO CHANGE</span>
                <span className="meta-val">{currentEffectObj.name}</span>
              </div>
            </button>
          </div>
        </aside>

        {/* ZONE 3: RIGHT CONTROL DECK */}
        <main className="control-deck-scroller">
          <div className="control-deck-inner">

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <section className="page active" aria-labelledby="heading-overview">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">DEVICE OVERVIEW</p>
                    <h1 id="heading-overview">PHANTOM X12 COCKPIT</h1>
                    <p className="subheading">Manage your mouse sensitivity, lighting, and battery.</p>
                  </div>
                </div>

                {/* Low Battery Warning Banner */}
                {battery !== null && battery <= 20 && (
                  <div className="low-battery-alert" role="alert">
                    <span className="alert-icon">⚡</span>
                    <div>
                      <div className="alert-title">CRITICAL BATTERY WARNING ({battery}%)</div>
                      <div className="alert-copy">Chassis charge is below 20%. Connect the USB-C cable to recharge.</div>
                    </div>
                  </div>
                )}

                <div className="tactical-modules-grid">
                  {/* Module 1: 20-Cell Battery Array */}
                  <article className="panel reading-block">
                    <div className="reading-head">
                      <div className="panel-header-title">
                        <span className="panel-icon-dot"></span>
                        <h2 className="panel-title">BATTERY</h2>
                      </div>
                    </div>

                    <div className="battery-main-display">
                      <div className="battery-numeric-readout">
                        <strong>{battery !== null ? battery : '--'}</strong>
                        <span>%</span>
                      </div>
                      <div className="battery-spec-meta">
                        <span className="meta-item"><span className="k">VOLTAGE:</span> <span className="v">3.7V LI-ION</span></span>
                        <span className="meta-item"><span className="k">STATE:</span> <span className="v">{chargeStatus}</span></span>
                      </div>
                    </div>

                    <div className="battery-cell-array">
                      {Array.from({ length: 20 }).map((_, idx) => {
                        const fillCount = battery !== null ? Math.round((battery / 100) * 20) : 0;
                        const isFilled = idx < fillCount;
                        const isDanger = battery !== null && battery <= 20;
                        const isWarn = battery !== null && battery > 20 && battery <= 40;
                        return (
                          <div
                            key={idx}
                            className={`battery-cell ${isFilled ? 'filled' : ''} ${isDanger ? 'danger' : ''} ${isWarn ? 'warn' : ''}`}
                          />
                        );
                      })}
                    </div>

                    <p className="panel-foot">
                      <span>
                        {battery !== null
                          ? batteryTelemetryStatus === 'stale' ? 'Last battery reading may be outdated' : 'Battery level is up to date'
                          : connected || wiredConnected || bluetoothHidConnected || bluetoothConnected
                            ? 'Waiting for battery data'
                            : 'Connect the mouse to see battery level'}
                      </span>
                      {batteryTelemetryStatus === 'stale' && (
                        <span className="telemetry-badge-stale">STALE</span>
                      )}
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
                        <strong>{selectedDpi.toLocaleString('en-US')}</strong>
                        <span className="unit">DPI</span>
                      </div>
                    </div>

                    {/* 6 Interlocking Hardware Paddles */}
                    <div className="dpi-paddle-rack">
                      {stages.map((dpi, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`dpi-stage ${idx + 1 === activeStage ? 'active' : ''}`}
                          onClick={() => handleStageClick(idx)}
                          title={`Click to switch to Stage ${idx + 1} (${dpi} DPI)`}
                        >
                          <span>{dpi.toLocaleString('en-US')}</span>
                        </button>
                      ))}
                    </div>

                  </article>

                  {/* Module 3: Active Effect Telemetry Card */}
                  <article className="panel reading-block">
                    <div className="reading-head">
                      <div className="panel-header-title">
                        <span className="panel-icon-dot"></span>
                        <h2 className="panel-title">CURRENT LIGHTING</h2>
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

              </section>
            )}

            {/* TAB 2: LIGHTING */}
            {activeTab === 'lighting' && (
              <section className="page active" aria-labelledby="heading-lighting">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">LIGHTING</p>
                    <h1 id="heading-lighting">LIGHTING STUDIO</h1>
                    <p className="subheading">Choose a lighting mode for your mouse.</p>
                  </div>
                  <div className="aircraft-toggle-box">
                    <span className="toggle-label">ON-DEVICE LIGHTING</span>
                    <div className="toggle-switch-housing">
                      <div className={`switch-diode ${controlConnected ? 'active' : ''}`}></div>
                      <span className="switch-status">{controlConnected ? controlMode === 'wired' ? 'Connected · Wired HID' : controlMode === 'bluetooth' ? 'Connected · Bluetooth HID' : 'Connected · 2.4 GHz Link' : 'Connect a control link to apply'}</span>
                    </div>
                  </div>
                </div>

                <div className="perf-layout-grid">
                  {/* Built-in Effects Grid */}
                  <article className="panel modes-panel">
                    <div className="section-heading inline">
                      <div>
                        <p className="eyebrow">LIGHTING MODES</p>
                        <h2>CHOOSE A MODE</h2>
                      </div>
                      <span className="mono-badge">
                        {controlConnected ? 'Mouse connected' : 'Connect the mouse to apply changes'}
                      </span>
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
                            <span
                              className={`mode-light-bar bar-${eff.name.split(' ')[1]?.toLowerCase() || 'aurora'}`}
                              style={{ background: eff.id === 6 ? '#1a1a1a' : undefined }}
                            ></span>
                          </div>
                          <div className="mode-copy">
                            <b>{eff.name}</b>
                            <small>{eff.pattern}</small>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="mode-footer-terminal">
                      <span className="mode-note-text">
                        Selected: {currentEffectObj.name}
                      </span>
                      <button
                        type="button"
                        className={`btn-transmit-pulse ${hasPendingLighting ? 'pulse-ready' : ''}`}
                        disabled={!controlConnected || isApplyingLighting}
                        onClick={handleApplyLightingClick}
                      >
                        <span className="transmit-icon">{isApplyingLighting ? '⏳' : '⚡'}</span>
                        <span>{isApplyingLighting ? 'APPLYING...' : 'APPLY TO MOUSE'}</span>
                      </button>
                    </div>
                  </article>

                </div>
              </section>
            )}

            {/* TAB 3: PERFORMANCE */}
            {activeTab === 'performance' && (
              <section className="page active" aria-labelledby="heading-performance">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">SENSITIVITY &amp; POLLING</p>
                    <h1 id="heading-performance">MOUSE SETTINGS</h1>
                    <p className="subheading">Six configurable sensitivity stages (200 to 12,000 DPI) and hardware polling rate calibration.</p>
                  </div>
                </div>

                {/* Pending changes alert */}
                {hasPendingProfileChanges && (
                  <div className="pending-hardware-banner" role="status">
                    <div className="pending-banner-left">
                      <span className="pending-pulse-dot" aria-hidden="true"></span>
                      <div>
                        <div className="pending-banner-title">PENDING HARDWARE EDITS DETECTED</div>
                        <div className="pending-banner-copy">Your mouse settings have changed. Apply them when you're ready.</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="button button-primary"
                      disabled={!controlConnected || isApplyingProfile}
                      onClick={onApplyProfileToHardware}
                    >
                      {isApplyingProfile ? 'WRITING...' : 'APPLY TO MOUSE ⚡'}
                    </button>
                  </div>
                )}

                <div className="perf-layout-grid">
                  <article className="panel perf-panel">
                    <div className="section-heading inline">
                      <div>
                        <p className="eyebrow">SENSITIVITY</p>
                        <h2>DPI STAGES</h2>
                      </div>
                      <span className="mono-badge">
                        {controlConnected ? 'Mouse connected' : 'Connect the mouse to apply changes'}
                      </span>
                    </div>

                    {/* Quick batch presets bar */}
                    <div className="batch-dpi-bar">
                      <span className="batch-dpi-label">SET ALL STAGES TO:</span>
                      <div className="batch-dpi-presets">
                        {[800, 1200, 1600, 2400, 3200, 6400].map((presetDpi) => (
                          <button
                            key={presetDpi}
                            type="button"
                            className="batch-preset-btn"
                            onClick={() => onSetAllStages(presetDpi)}
                          >
                            {presetDpi} DPI
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="dpi-equalizer-rack">
                      {stages.map((dpi, idx) => (
                        <div
                          key={idx}
                          className={`dpi-row ${idx + 1 === activeStage ? 'active' : ''}`}
                        >
                          <label htmlFor={`dpi-range-${idx}`}>STAGE {idx + 1}</label>
                          <input
                            id={`dpi-range-${idx}`}
                            type="range"
                            min={DPI_MIN}
                            max={DPI_MAX}
                            step={DPI_STEP}
                            value={dpi}
                            onChange={(e) => onChangeStageDpi(idx, clampDpi(Number(e.target.value)))}
                            aria-label={`Stage ${idx + 1} DPI Slider`}
                          />
                          <div className="dpi-controls-right">
                            <input
                              type="number"
                              min={DPI_MIN}
                              max={DPI_MAX}
                              step={DPI_STEP}
                              value={dpi}
                              onChange={(e) => onChangeStageDpi(idx, clampDpi(Number(e.target.value)))}
                              className="dpi-num-input"
                              aria-label={`Stage ${idx + 1} DPI Value`}
                            />
                            <button
                              type="button"
                              className={`stage-activate-btn ${idx + 1 === activeStage ? 'active' : ''}`}
                              onClick={() => onChangeActiveStage(idx + 1)}
                              title={`Set Stage ${idx + 1} as active hardware stage`}
                            >
                              {idx + 1 === activeStage ? 'ACTIVE' : 'SELECT'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="poll-calibration-deck">
                      <div className="range-label">
                          <span>POLLING RATE</span>
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
                            onClick={() => {
                              sound.click();
                              onChangePollingRate(p.hz);
                            }}
                          >
                            <span className="poll-hz">{p.hz} Hz</span>
                            <span className="poll-ms">{p.ms}</span>
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <button
                          type="button"
                          className={`btn-transmit-pulse ${hasPendingProfileChanges ? 'pulse-ready' : ''}`}
                          disabled={!controlConnected || isApplyingProfile}
                          onClick={onApplyProfileToHardware}
                        >
                          <span className="transmit-icon">{isApplyingProfile ? '⏳' : '⚡'}</span>
                          <span>
                            {isApplyingProfile
                              ? 'APPLYING...'
                              : 'APPLY TO MOUSE'}
                          </span>
                        </button>
                      </div>

                      <div className="polling-test-card mt-3">
                        <div className="polling-test-info">
                          <span className="polling-test-icon" aria-hidden="true">🎯</span>
                          <span className="polling-test-copy">
                            Verify your live hardware report rate in real-time:
                          </span>
                        </div>
                        <a
                          href="https://cpstest.org/polling-rate-test/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="polling-test-link"
                          title="Open cpstest.org polling rate tester in a new tab"
                        >
                          <span>https://cpstest.org/polling-rate-test/</span>
                          <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
                            <path d="M6 3H3V13H13V10M9 3H13V7M13 3L7 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </a>
                      </div>
                    </div>
                  </article>

                </div>
              </section>
            )}

            {/* TAB 4: PROFILES */}
            {activeTab === 'profiles' && (
              <section className="page active" aria-labelledby="heading-profiles">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">SAVED SETTINGS</p>
                    <h1 id="heading-profiles">PROFILES</h1>
                    <p className="subheading">Save, import, or export your mouse settings.</p>
                  </div>
                </div>

                {/* Profile Controls Bar */}
                <div className="panel profile-controls-panel">
                  <div className="profile-controls-layout">
                    <div className="profile-create-controls">
                      <input
                        type="text"
                        placeholder="New Profile Name..."
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                        className="tactical-hex-input text-left profile-name-input"
                        aria-label="New Profile Name"
                      />
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() => {
                          if (newProfileName.trim()) {
                            onSaveProfile(newProfileName.trim());
                            setNewProfileName('');
                          }
                        }}
                      >
                        SAVE CURRENT AS PROFILE
                      </button>
                    </div>

                    <div className="profile-import-controls">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".json"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            onImportProfile(e.target.files[0]);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        IMPORT PROFILE JSON
                      </button>
                    </div>
                  </div>

                  {/* Profile Cards Grid */}
                  <div className="profile-library-grid">
                    {profiles.map((prof) => (
                      <div
                        key={prof.id}
                        className={`profile-card ${prof.id === activeProfileId ? 'active' : ''}`}
                      >
                        <div>
                          <div className="profile-card-head">
                            <span className="profile-card-title">{prof.name}</span>
                            {prof.id === activeProfileId && (
                              <span className="mono-badge">ACTIVE</span>
                            )}
                          </div>
                          <div className="profile-specs-list">
                            <span>POLLING: {prof.pollingRate || 1000} Hz</span>
                            <span>ACTIVE STAGE: {prof.activeStage || 1}</span>
                            <span>DPI: {prof.stages ? prof.stages.join(', ') : '1200-12000'}</span>
                          </div>
                        </div>

                        <div className="profile-card-actions">
                          <button
                            type="button"
                            className="button button-primary text-xs py-1 px-3"
                            onClick={() => onLoadProfile(prof)}
                          >
                            LOAD
                          </button>
                          <button
                            type="button"
                            className="button button-secondary text-xs py-1 px-3"
                            onClick={() => onExportProfile(prof)}
                          >
                            EXPORT
                          </button>
                          {profiles.length > 1 && (
                            <button
                              type="button"
                              className="button button-secondary text-xs py-1 px-2 text-red-400 hover:text-red-300"
                              onClick={() => onDeleteProfile(prof.id)}
                            >
                              DELETE
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Settings storage summary */}
                <div className="panel profile-storage-panel">
                  <div className="profile-storage-heading">
                    <p className="eyebrow">SETTINGS</p>
                    <h2>WHERE SETTINGS ARE SAVED</h2>
                  </div>
                  <div className="settings-storage-copy">
                    <p><strong>Mouse:</strong> sensitivity stages, polling rate, and lighting mode.</p>
                    <p><strong>This browser:</strong> saved profiles.</p>
                  </div>
                </div>

                {/* Safe Known-Good Baseline Restore Card */}
                <div className="system-restore-card">
                  <div className="restore-card-head">
                    <span className="text-xl">🛡️</span>
                    <h3>RESTORE DEFAULT SETTINGS</h3>
                  </div>
                  <p className="text-xs text-text-secondary mb-4">
                    Restore the standard DPI stages, 1000 Hz polling, and Aurora lighting. When connected, the settings are applied to the mouse.
                  </p>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={onRestoreKnownGoodBaseline}
                  >
                    RESTORE DEFAULTS
                  </button>
                </div>
              </section>
            )}

            {/* TAB 5: ABOUT */}
            {activeTab === 'about' && (
              <section className="page active" aria-labelledby="heading-about">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">ENGINEERING SPEC PLATE</p>
                    <h1 id="heading-about">SYSTEM &amp; CREDITS</h1>
                    <p className="subheading">Laser-etched hardware specifications and developer links.</p>
                  </div>
                </div>

                <div className="about-spec-plate">
                  <div className="spec-plate-inner">
                    <div className="spec-plate-header">
                      <div className="plate-title">ACER PHANTOM X12 MOUSE CONTROLS</div>
                      <div className="plate-serial">2.4 GHz wireless receiver</div>
                    </div>

                    <div className="plate-grid">
                      <div className="plate-cell">
                        <span className="pk">CONNECTION</span>
                        <span className="pv mono">2.4 GHz USB receiver</span>
                      </div>
                      <div className="plate-cell">
                        <span className="pk">TRANSPORT LAYER</span>
                        <span className="pv mono">Chrome or Edge browser</span>
                      </div>
                      <div className="plate-cell">
                        <span className="pk">OPTICAL ENGINE</span>
                        <span className="pv mono">Up to 12,000 DPI / 1000 Hz polling rate</span>
                      </div>
                      <div className="plate-cell">
                        <span className="pk">PROJECT LICENSE</span>
                        <span className="pv mono">Open-source MIT / Independent Utility</span>
                      </div>
                    </div>

                    <div className="plate-bio-section">
                      <span className="pk">DEVELOPER STATEMENT</span>
                      <p className="plate-bio-text">
                        I wanted a simple way to control the mouse I bought, so I built this app. It took me about a week to put together. If you find it useful, your support helps me keep improving it. Thank you!
                      </p>
                    </div>

                    <section className="system-upi-panel" aria-labelledby="system-upi-title">
                      <div className="system-upi-copy">
                        <span className="pk">SUPPORT</span>
                        <h2 id="system-upi-title">Pay with UPI</h2>
                        <p>Scan the QR code or use this UPI ID.</p>
                        <div className="upi-id-copy">
                          <code>sonesh2202@okicici</code>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText('sonesh2202@okicici');
                                setUpiCopied(true);
                                window.setTimeout(() => setUpiCopied(false), 1800);
                              } catch {
                                setUpiCopied(false);
                              }
                            }}
                          >
                            {upiCopied ? 'COPIED' : 'COPY ID'}
                          </button>
                        </div>
                      </div>
                      <img
                        className="system-upi-qr"
                        src={`${import.meta.env.BASE_URL}upi-qr.png`}
                        alt="UPI payment QR code for sonesh2202@okicici"
                        width="1152"
                        height="2048"
                      />
                    </section>

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
                        <b>Issues</b>
                        <small>Report feedback</small>
                      </a>
                      <a
                        href="https://github.com/sponsors/sonesh-2202"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="plate-chip"
                        onClick={() => sound.click()}
                      >
                        <b>GitHub Sponsors</b>
                        <small>Support development</small>
                      </a>
                      <a
                        href="https://sonesh2202.me"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="plate-chip"
                        onClick={() => sound.click()}
                      >
                        <b>Website</b>
                        <small>sonesh2202.me</small>
                      </a>
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
