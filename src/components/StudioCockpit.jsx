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
  BUTTON_ACTIONS,
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
  // Button Mappings
  buttonMappings = [],
  onUpdateBtnMapping,
  onResetBtnMappings,
  // Macros
  macros = [],
  onSaveMacro,
  onDeleteMacro,
  // Profiles & Restore
  profiles = [],
  activeProfileId = 'default',
  onSaveProfile,
  onLoadProfile,
  onDeleteProfile,
  onExportProfile,
  onImportProfile,
  onRestoreKnownGoodBaseline,
  // Modals & Theme
  onOpenPatronage,
  theme,
  onToggleTheme,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [batteryView, setBatteryView] = useState('both');
  const [highlightedButton, setHighlightedButton] = useState('M1');
  const [sfxActive, setSfxActive] = useState(true);
  const [hasPendingLighting, setHasPendingLighting] = useState(false);

  // New profile name input state
  const [newProfileName, setNewProfileName] = useState('');

  // Macro Editor state
  const [selectedMacroIndex, setSelectedMacroIndex] = useState(0);
  const [isRecordingMacro, setIsRecordingMacro] = useState(false);
  const [recordedEvents, setRecordedEvents] = useState([]);
  const recordingStartTimeRef = useRef(null);
  const lastEventTimeRef = useRef(null);

  const laserPillRef = useRef(null);
  const dockNavRef = useRef(null);
  const fileInputRef = useRef(null);

  // Keyboard navigation [1] to [7]
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      const keyMap = {
        1: 'overview',
        2: 'lighting',
        3: 'performance',
        4: 'buttons',
        5: 'macros',
        6: 'profiles',
        7: 'about',
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

  // Macro recording listeners
  useEffect(() => {
    if (!isRecordingMacro) return;

    const onKeyDown = (e) => {
      // Don't intercept tab navigation keys
      if (e.key === 'Tab') return;
      const now = performance.now();
      const delay = lastEventTimeRef.current ? Math.round(now - lastEventTimeRef.current) : 0;
      lastEventTimeRef.current = now;

      setRecordedEvents((prev) => [
        ...prev,
        { kind: 'key', action: `KeyDown:${e.code || e.key}`, delay_ms: Math.min(5000, Math.max(10, delay)) },
      ]);
    };

    const onKeyUp = (e) => {
      const now = performance.now();
      const delay = lastEventTimeRef.current ? Math.round(now - lastEventTimeRef.current) : 10;
      lastEventTimeRef.current = now;

      setRecordedEvents((prev) => [
        ...prev,
        { kind: 'key', action: `KeyUp:${e.code || e.key}`, delay_ms: Math.min(5000, Math.max(10, delay)) },
      ]);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isRecordingMacro]);

  const toggleMacroRecording = () => {
    sound.click();
    if (isRecordingMacro) {
      // Stop recording and append events to current macro
      setIsRecordingMacro(false);
      if (recordedEvents.length > 0 && macros[selectedMacroIndex]) {
        const current = macros[selectedMacroIndex];
        const updated = {
          ...current,
          events: [...current.events, ...recordedEvents],
        };
        onSaveMacro(updated);
      }
      setRecordedEvents([]);
      recordingStartTimeRef.current = null;
      lastEventTimeRef.current = null;
    } else {
      // Start recording
      setRecordedEvents([]);
      recordingStartTimeRef.current = performance.now();
      lastEventTimeRef.current = performance.now();
      setIsRecordingMacro(true);
    }
  };

  const currentEffectObj = EFFECTS.find((e) => e.id === selectedEffect) || EFFECTS[0];
  const selectedDpi = stages[activeStage - 1] ?? activeDpi;
  const activeMacro = macros[selectedMacroIndex] || macros[0] || { name: 'New Macro', loopCount: 1, events: [] };
  const selectedBtnObj = buttonMappings.find((b) => b.id === highlightedButton) || buttonMappings[0];

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
              <span className="studio-version-tag">LAUNCH READY // A8A5:2255</span>
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
            { id: 'buttons', key: '4', label: 'BUTTONS' },
            { id: 'macros', key: '5', label: 'MACROS' },
            { id: 'profiles', key: '6', label: 'PROFILES' },
            { id: 'about', key: '7', label: 'SYSTEM' },
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
              <span className="meta-label">FIRMWARE LINK</span>
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
              highlightedButton={highlightedButton}
              onButtonClick={(btn) => {
                sound.click();
                setHighlightedButton(btn);
                if (activeTab !== 'buttons') switchTab('buttons');
              }}
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

        {/* ZONE 3: RIGHT CONTROL DECK */}
        <main className="control-deck-scroller">
          <div className="control-deck-inner">

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <section className="page active" aria-labelledby="heading-overview">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">TACTICAL TELEMETRY</p>
                    <h1 id="heading-overview">PHANTOM X12 COCKPIT</h1>
                    <p className="subheading">Direct bidirectional telemetry streamed from the 2.4&nbsp;GHz receiver.</p>
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
                          <strong>{battery !== null ? battery : '--'}</strong>
                          <span>%</span>
                        </div>
                        <div className="battery-spec-meta">
                          <span className="meta-item"><span className="k">VOLTAGE:</span> <span className="v">3.7V LI-ION</span></span>
                          <span className="meta-item"><span className="k">STATE:</span> <span className="v">{chargeStatus}</span></span>
                          <span className="meta-item">
                            <span className="k">STATUS:</span>{' '}
                            <span className="v">
                              {batteryTelemetryStatus === 'live' && 'STREAMING LIVE'}
                              {batteryTelemetryStatus === 'stale' && 'STALE (>45s)'}
                              {batteryTelemetryStatus === 'waiting' && 'WAITING 0xD0'}
                              {batteryTelemetryStatus === 'unavailable' && 'RECEIVER OFFLINE'}
                            </span>
                          </span>
                        </div>
                      </div>
                    )}

                    {(batteryView === 'both' || batteryView === 'bar') && (
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
                    )}

                    <p className="panel-foot">
                      <span>
                        {connected
                          ? battery !== null
                            ? 'Unsolicited 0xD0 streaming live'
                            : 'Connected. Waiting for receiver battery report (0xD0)...'
                          : wiredConnected
                            ? battery !== null ? 'Wired battery telemetry live' : 'Wired connected; waiting for battery telemetry'
                            : bluetoothHidConnected
                              ? battery !== null ? 'Bluetooth HID battery telemetry live' : 'Bluetooth HID connected; waiting for battery telemetry'
                              : bluetoothConnected
                                ? battery !== null ? 'Bluetooth LE Battery Service streaming live' : 'Bluetooth connected; waiting for battery telemetry'
                                : 'Connect the 2.4 GHz receiver, wired HID, or Bluetooth battery service'}
                      </span>
                      {batteryTelemetryStatus === 'stale' && (
                        <span className="telemetry-badge-stale">STALE</span>
                      )}
                      {batteryTelemetryStatus === 'waiting' && (
                        <span className="telemetry-badge-waiting">WAITING 0xD0</span>
                      )}
                      {batteryTelemetryStatus === 'live' && (
                        <span className="mono-badge">STREAMING D0</span>
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
                      <div className="dpi-aux-meta">
                        <span className="meta-label">OPTICAL TRACKER</span>
                        <span className="meta-val">1:1 NATIVE HARDWARE ACCEL: OFF</span>
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

                    <p className="panel-foot">
                      <span>Instant hardware scrambler switch · CMD 0x0E</span>
                      <span className="mono-badge">STAGE {activeStage}</span>
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

              </section>
            )}

            {/* TAB 2: LIGHTING */}
            {activeTab === 'lighting' && (
              <section className="page active" aria-labelledby="heading-lighting">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">CHROMA MATRIX // HARDWARE MODES</p>
                    <h1 id="heading-lighting">LIGHTING STUDIO</h1>
                    <p className="subheading">Seven onboard modes decoded from physical device observation.</p>
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
                        <p className="eyebrow">ONBOARD PRESETS</p>
                        <h2>7 HARDWARE CHROMA MODES</h2>
                      </div>
                      <span className="mono-badge">
                        {controlConnected ? controlMode === 'wired' ? 'Wired Hardware Transmit (0x21)' : controlMode === 'bluetooth' ? 'Bluetooth HID Transmit (0x21)' : 'Verified Hardware Transmit (0x21)' : 'Connect a control link to apply'}
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
                            <span className="mode-cmd">0x0{eff.cmd}</span>
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
                      <div className="terminal-raw-payload">
                        <span className="payload-label">REPORT 0x21 PAYLOAD:</span>
                        <code className="payload-hex">55 21 00 00 03 00 00 00 00 00 0{selectedEffect} ...</code>
                      </div>
                      <span className="mode-note-text">
                        Selected: {currentEffectObj.name} · CMD 0x0{currentEffectObj.cmd}
                      </span>
                      <button
                        type="button"
                        className={`btn-transmit-pulse ${hasPendingLighting ? 'pulse-ready' : ''}`}
                        disabled={!controlConnected || isApplyingLighting}
                        onClick={handleApplyLightingClick}
                      >
                        <span className="transmit-icon">{isApplyingLighting ? '⏳' : '⚡'}</span>
                        <span>{isApplyingLighting ? 'TRANSMITTING...' : 'TRANSMIT TO HARDWARE (APPLY)'}</span>
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
                    <p className="eyebrow">SENSOR &amp; POLLING CALIBRATION</p>
                    <h1 id="heading-performance">PERFORMANCE RACK</h1>
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
                        <div className="pending-banner-copy">Sliders or polling rate have changed. Click "Transmit Profile to Hardware" to apply.</div>
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
                        <p className="eyebrow">PRECISION TELEMETRY RACK</p>
                        <h2>6-STAGE DPI EQUALIZER</h2>
                      </div>
                      <span className="mono-badge">
                        {controlConnected ? controlMode === 'wired' ? 'Wired Profile (0x0E / 0x0F)' : controlMode === 'bluetooth' ? 'Bluetooth HID Profile (0x0E / 0x0F)' : 'Verified Read/Write (0x0E / 0x0F)' : 'Connect a control link to apply'}
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
                              ? 'TRANSMITTING & VERIFYING...'
                              : 'TRANSMIT PROFILE TO HARDWARE (APPLY)'}
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

            {/* TAB 4: BUTTONS */}
            {activeTab === 'buttons' && (
              <section className="page active" aria-labelledby="heading-buttons">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">HARDWARE SWITCH MAPPING // PROTOCOL STUDIO</p>
                    <h1 id="heading-buttons">BUTTON REMAPPING</h1>
                    <p className="subheading">Physical microswitch blueprint and decoded packet semantics.</p>
                  </div>
                </div>

                <div className="split-layout-tactical">
                  <article className="panel blueprint-panel">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="eyebrow">PHYSICAL SWITCH BLUEPRINT</p>
                        <h2>PHANTOM X12 SWITCH MATRIX (M1 - M6 &amp; WHEEL)</h2>
                      </div>
                      <button
                        type="button"
                        className="button button-secondary text-xs"
                        onClick={onResetBtnMappings}
                      >
                        RESTORE DEFAULTS
                      </button>
                    </div>

                    <div className="button-blueprint-visual">
                      {buttonMappings.map((btn) => (
                        <div
                          key={btn.id}
                          className={`button-chip ${highlightedButton === btn.id ? 'selected' : ''}`}
                          onMouseEnter={() => setHighlightedButton(btn.id)}
                          onClick={() => {
                            sound.click();
                            setHighlightedButton(btn.id);
                          }}
                        >
                          <span className="btn-num">{btn.id}</span>
                          <span className="btn-name">{btn.name}</span>
                          <span className="btn-status">
                            {BUTTON_ACTIONS.find((a) => a.id === btn.defaultAction)?.label || btn.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Selected Button Editor Card */}
                    {selectedBtnObj && (
                      <div className="btn-editor-card">
                        <div className="btn-editor-head">
                          <span className="btn-editor-title">
                            {selectedBtnObj.id}: {selectedBtnObj.name}
                          </span>
                          <span className="mono text-xs text-volt">
                            CODE: {selectedBtnObj.code.map((c) => c.toString(16).padStart(2, '0').toUpperCase()).join(' ')}
                          </span>
                        </div>

                        <div className="btn-editor-grid">
                          <div>
                            <label className="control-label" htmlFor="btn-action-select">ASSIGNED ACTION</label>
                            <select
                              id="btn-action-select"
                              className="tactical-select"
                              value={selectedBtnObj.defaultAction}
                              onChange={(e) => onUpdateBtnMapping(selectedBtnObj.id, e.target.value)}
                            >
                              {BUTTON_ACTIONS.map((act) => (
                                <option key={act.id} value={act.id}>{act.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="control-label">HARDWARE STATUS</label>
                            <div className="text-xs text-muted mt-2">
                              Default mapping table decoded from captured <code>0x09</code> packets.
                            </div>
                          </div>
                        </div>

                        <p className="hardware-note">
                          <span aria-hidden="true">ⓘ</span> 
                          Custom button assignments are stored safely in your local profile. The OEM configurator capture revealed only repeated default frames; custom on-device EEPROM remapping writes are gated to protect physical switch routing.
                        </p>
                      </div>
                    )}
                  </article>

                </div>
              </section>
            )}

            {/* TAB 5: MACROS */}
            {activeTab === 'macros' && (
              <section className="page active" aria-labelledby="heading-macros">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">LOCAL MACRO ENGINE // INPUT RECORDER</p>
                    <h1 id="heading-macros">MACRO STUDIO</h1>
                    <p className="subheading">Create, record, and export timed keystroke and mouse event sequences.</p>
                  </div>
                </div>

                <div className="macro-studio-layout">
                  {/* Macro List Sidebar */}
                  <div className="macro-sidebar">
                    <div className="flex items-center justify-between mb-1">
                      <b className="text-sm font-mono">MACRO LIBRARY</b>
                      <button
                        type="button"
                        className="button button-secondary text-xs py-1 px-2"
                        onClick={() => {
                          const newName = `Macro ${macros.length + 1}`;
                          onSaveMacro({ name: newName, loopCount: 1, events: [] });
                          setSelectedMacroIndex(macros.length);
                        }}
                      >
                        + NEW
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto">
                      {macros.map((m, idx) => (
                        <div
                          key={idx}
                          className={`macro-item-chip ${idx === selectedMacroIndex ? 'active' : ''}`}
                          onClick={() => {
                            sound.click();
                            setSelectedMacroIndex(idx);
                          }}
                        >
                          <div>
                            <div className="font-bold text-xs">{m.name}</div>
                            <div className="text-[10px] text-muted">{m.events?.length || 0} events · loop x{m.loopCount || 1}</div>
                          </div>
                          {macros.length > 1 && (
                            <button
                              type="button"
                              className="text-xs text-muted hover:text-red-400 p-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteMacro(m.name);
                                setSelectedMacroIndex(0);
                              }}
                              title="Delete Macro"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Macro Editor Deck */}
                  <div className="macro-editor-stage">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-mono text-muted" htmlFor="macro-name-input">NAME:</label>
                        <input
                          id="macro-name-input"
                          type="text"
                          value={activeMacro.name}
                          onChange={(e) => {
                            onSaveMacro({ ...activeMacro, name: e.target.value });
                          }}
                          className="tactical-hex-input w-48 text-left"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-mono text-muted" htmlFor="macro-loop-input">LOOPS (1-100):</label>
                        <input
                          id="macro-loop-input"
                          type="number"
                          min="1"
                          max="100"
                          value={activeMacro.loopCount || 1}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(1, Number(e.target.value)));
                            onSaveMacro({ ...activeMacro, loopCount: val });
                          }}
                          className="dpi-num-input"
                        />
                      </div>
                    </div>

                    {/* Live Recorder Deck */}
                    <div className="macro-recorder-deck">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className={`record-pulse-btn ${isRecordingMacro ? 'recording' : ''}`}
                          onClick={toggleMacroRecording}
                        >
                          <span>●</span>
                          <span>{isRecordingMacro ? 'STOP RECORDING' : 'RECORD INPUTS'}</span>
                        </button>
                        <span className="text-xs text-muted">
                          {isRecordingMacro
                            ? `Recording keystrokes... (${recordedEvents.length} events captured)`
                            : 'Click Record, then press keys to capture timing'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="button button-secondary text-xs"
                          onClick={() => {
                            sound.click();
                            const blob = new Blob([JSON.stringify(activeMacro, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `macro-${activeMacro.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          EXPORT JSON
                        </button>
                      </div>
                    </div>

                    {/* Event Timeline List */}
                    <div className="macro-timeline-list">
                      {activeMacro.events?.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted">
                          No events in this macro. Click "RECORD INPUTS" or add an action below.
                        </div>
                      ) : (
                        activeMacro.events.map((ev, i) => (
                          <div key={i} className="macro-event-row">
                            <span className="text-xs font-mono text-muted">#{i + 1}</span>
                            <span className="text-xs font-mono font-bold text-white">{ev.action}</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="60000"
                                value={ev.delay_ms}
                                onChange={(e) => {
                                  const updatedEvents = [...activeMacro.events];
                                  updatedEvents[i] = { ...ev, delay_ms: Number(e.target.value) };
                                  onSaveMacro({ ...activeMacro, events: updatedEvents });
                                }}
                                className="dpi-num-input w-20"
                                aria-label="Delay milliseconds"
                              />
                              <span className="text-[10px] text-muted">ms</span>
                            </div>
                            <button
                              type="button"
                              className="text-muted hover:text-red-400 text-xs"
                              onClick={() => {
                                sound.click();
                                const updatedEvents = activeMacro.events.filter((_, idx) => idx !== i);
                                onSaveMacro({ ...activeMacro, events: updatedEvents });
                              }}
                              title="Delete Event"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Event Row */}
                    <div className="flex items-center gap-2 pt-2 border-t border-panel-border">
                      <button
                        type="button"
                        className="button button-secondary text-xs"
                        onClick={() => {
                          sound.click();
                          const updated = [...(activeMacro.events || []), { kind: 'mouse', action: 'left_click', delay_ms: 25 }];
                          onSaveMacro({ ...activeMacro, events: updated });
                        }}
                      >
                        + Left Click
                      </button>
                      <button
                        type="button"
                        className="button button-secondary text-xs"
                        onClick={() => {
                          sound.click();
                          const updated = [...(activeMacro.events || []), { kind: 'mouse', action: 'right_click', delay_ms: 25 }];
                          onSaveMacro({ ...activeMacro, events: updated });
                        }}
                      >
                        + Right Click
                      </button>
                      <button
                        type="button"
                        className="button button-secondary text-xs"
                        onClick={() => {
                          sound.click();
                          const updated = [...(activeMacro.events || []), { kind: 'key', action: 'Delay', delay_ms: 50 }];
                          onSaveMacro({ ...activeMacro, events: updated });
                        }}
                      >
                        + 50ms Delay
                      </button>
                    </div>

                    <p className="hardware-note mt-4">
                      <span aria-hidden="true">ⓘ</span> 
                      Browser sandbox boundaries prevent direct injection of synthetic OS keystrokes into other desktop apps without a native background daemon or on-device microcode. Onboard EEPROM chunk upload (<code>0x0D</code> / <code>0x10</code>) is in active protocol verification.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* TAB 6: PROFILES & RECOVERY */}
            {activeTab === 'profiles' && (
              <section className="page active" aria-labelledby="heading-profiles">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">CONFIGURATION ARCHIVE &amp; SYSTEM RECOVERY</p>
                    <h1 id="heading-profiles">PROFILES &amp; RECOVERY</h1>
                    <p className="subheading">Manage local profile presets, file export/import, and safe hardware baseline restore.</p>
                  </div>
                </div>

                {/* Profile Controls Bar */}
                <div className="panel mb-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="New Profile Name..."
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                        className="tactical-hex-input w-64 text-left"
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

                    <div className="flex items-center gap-2">
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

                {/* Storage Boundaries Clarification Table */}
                <div className="panel mb-6">
                  <div className="section-heading mb-3">
                    <p className="eyebrow">STORAGE SPECIFICATION</p>
                    <h2>STORAGE BOUNDARIES: HARDWARE VS BROWSER</h2>
                  </div>
                  <div className="table-scroll">
                    <table className="capability-table tactical-table">
                      <thead>
                        <tr>
                          <th scope="col">SETTING CATEGORY</th>
                          <th scope="col">STORED ON MOUSE (HARDWARE)</th>
                          <th scope="col">STORED IN BROWSER STORAGE</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <th scope="row">DPI Stages (6 Values)</th>
                          <td><span className="tag tag-ok">WRITTEN TO EEPROM (0x0F)</span></td>
                          <td>Persisted in profile backups</td>
                        </tr>
                        <tr>
                          <th scope="row">Active DPI Stage &amp; Polling Rate</th>
                          <td><span className="tag tag-ok">WRITTEN TO EEPROM (0x0F)</span></td>
                          <td>Persisted in profile backups</td>
                        </tr>
                        <tr>
                          <th scope="row">Onboard Lighting Mode (0-6)</th>
                          <td><span className="tag tag-ok">WRITTEN TO FIRMWARE (0x21)</span></td>
                          <td>Persisted in profile backups</td>
                        </tr>
                        <tr>
                          <th scope="row">Custom Shader Colors &amp; Scenes</th>
                          <td><span className="tag tag-read">NOT SUPPORTED BY HW</span></td>
                          <td><span className="tag tag-live">LOCALSTORAGE</span></td>
                        </tr>
                        <tr>
                          <th scope="row">Macro Sequences &amp; Button Remapping</th>
                          <td><span className="tag tag-read">LOCKED PENDING AUDIT</span></td>
                          <td><span className="tag tag-live">LOCALSTORAGE</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Safe Known-Good Baseline Restore Card */}
                <div className="system-restore-card">
                  <div className="restore-card-head">
                    <span className="text-xl">🛡️</span>
                    <h3>RESTORE KNOWN-GOOD HARDWARE BASELINE</h3>
                  </div>
                  <p className="text-xs text-text-secondary mb-4">
                    Safely restores the verified factory baseline settings: 1000 Hz polling rate, Active Stage 1, standard 6-stage DPI curve (1200, 2400, 3200, 4800, 6400, 12000), Aurora lighting mode, and standard switch mappings. Uses validated 0x0F and 0x21 packets with read-back verification without triggering unsafe vendor factory-reset commands.
                  </p>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={onRestoreKnownGoodBaseline}
                  >
                    APPLY KNOWN-GOOD BASELINE
                  </button>
                </div>
              </section>
            )}

            {/* TAB 7: ABOUT */}
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
                      <div className="plate-title">ACER PHANTOM X12 // TACTICAL WEBHID SUITE</div>
                      <div className="plate-serial">YJX 2.4 GHz RECEIVER · A8A5:2255</div>
                    </div>

                    <div className="plate-grid">
                      <div className="plate-cell">
                        <span className="pk">HARDWARE VID:PID</span>
                        <span className="pv mono">0xA8A5 : 0x2255</span>
                      </div>
                      <div className="plate-cell">
                        <span className="pk">TRANSPORT LAYER</span>
                        <span className="pv mono">Chromium WebHID API / 64-byte chunks</span>
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
                        <small>Report feedback</small>
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
