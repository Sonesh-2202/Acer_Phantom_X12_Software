import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { sound } from '../utils/audio';

gsap.registerPlugin(ScrollTrigger);

export function LandingPage({
  onLaunchStudio,
  onConnectReceiver,
  onOpenPatronage,
  onOpenLegal,
  connected,
  battery,
  activeEffect,
  activeColor,
}) {
  const containerRef = useRef(null);
  const watermarkRef = useRef(null);
  const heroMouseRef = useRef(null);
  const scrollyPinRef = useRef(null);
  const scrollyVisualRef = useRef(null);

  // GSAP Animations with safe lifecycle cleanup via useGSAP
  useGSAP(
    () => {
      // 1. Watermark horizontal scroll drift
      if (watermarkRef.current) {
        gsap.to(watermarkRef.current, {
          x: -360,
          ease: 'none',
          scrollTrigger: {
            trigger: '#hero-stage',
            start: 'top top',
            end: 'bottom top',
            scrub: 1,
          },
        });
      }

      // 2. Hero mouse subtle floating physics
      if (heroMouseRef.current) {
        gsap.to(heroMouseRef.current, {
          y: -14,
          duration: 3,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
        });
      }

      // 3. Pinned Scrollytelling Breakdown
      if (scrollyPinRef.current && scrollyVisualRef.current) {
        ScrollTrigger.create({
          trigger: scrollyPinRef.current,
          start: 'top 120px',
          end: '+=1000',
          pin: scrollyVisualRef.current,
          scrub: true,
        });

        // Staggered leader lines scrub
        [1, 2, 3, 4].forEach((num) => {
          const line = document.getElementById(`leader-line-${num}`);
          const card = document.getElementById(`scrolly-card-${num}`);
          if (line && card) {
            gsap.to(line, {
              strokeDashoffset: 0,
              ease: 'none',
              scrollTrigger: {
                trigger: card,
                start: 'top 65%',
                end: 'bottom 55%',
                scrub: true,
              },
            });
          }
        });
      }
    },
    { scope: containerRef }
  );

  // Mouse spotlight gradient tracker
  useEffect(() => {
    const handleMouseMove = (e) => {
      const cards = document.querySelectorAll('.bento-card, .rack-card');
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const copyGit = () => {
    sound.ack();
    navigator.clipboard.writeText('git clone https://github.com/sonesh-2202/Acer_Phantom_X12_Software.git');
    const btn = document.getElementById('copy-git-btn');
    if (btn) {
      btn.textContent = 'COPIED!';
      setTimeout(() => (btn.textContent = 'COPY'), 2000);
    }
  };

  const copyLinux = () => {
    sound.ack();
    navigator.clipboard.writeText('chmod +x Phantom*.AppImage && ./Phantom*.AppImage');
    const btn = document.getElementById('copy-linux-cmd');
    if (btn) {
      btn.textContent = 'COPIED!';
      setTimeout(() => (btn.textContent = 'COPY'), 2000);
    }
  };

  return (
    <div ref={containerRef} className="landing-view">
      {/* Landing Header */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <a href="#hero-stage" className="landing-brand" onClick={() => sound.click()}>
            <svg className="brand-glyph" viewBox="0 0 32 32" fill="none">
              <polygon points="16,2 30,10 30,22 16,30 2,22 2,10" stroke="var(--volt)" strokeWidth="2" fill="rgba(163,255,18,0.06)" />
              <path d="M10 16L16 10L22 16L16 22Z" fill="var(--volt)" />
              <circle cx="16" cy="16" r="2" fill="#060709" />
            </svg>
            <div className="brand-text">
              <span className="brand-title">ACER PHANTOM X12</span>
              <span className="brand-subtitle">DRIVER SUITE // WEBHID</span>
            </div>
          </a>

          <nav className="landing-nav" aria-label="Product Navigation">
            <a href="#hero-stage" className="landing-nav-link active" onClick={() => sound.click()}>LAUNCHPAD</a>
            <a href="#hardware-details" className="landing-nav-link" onClick={() => sound.click()}>DETAILS &amp; SPECS</a>
            <a href="#support-dev" className="landing-nav-link" onClick={() => sound.click()}>OPEN PROTOCOL</a>
            <a href="#downloads" className="landing-nav-link" onClick={() => sound.click()}>NATIVE SUITE</a>
          </nav>

          <div className="landing-header-actions">
            <div className="hardware-pill-mini">
              <span className="pulse-dot"></span>
              <span className="mono-tag">{connected ? 'RECEIVER CONNECTED' : '2.4GHz RECEIVER READY'}</span>
            </div>
            <button
              type="button"
              className="cta-volt-mini"
              onClick={() => {
                sound.click();
                onConnectReceiver();
              }}
            >
              <span>{connected ? 'CONNECTED' : 'CONNECT'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* SECTION 1: HERO STAGE ("TACTICAL LAUNCHPAD") */}
      <section id="hero-stage" className="hero-stage">
        {/* Watermark Drifting Track */}
        <div className="watermark-container" aria-hidden="true">
          <div ref={watermarkRef} className="watermark-track">
            <span>PHANTOM X12 // ULTRA-LIGHTWEIGHT WIRELESS // 1000HZ WEBHID // 12,000 DPI // ZERO BLOATWARE // </span>
          </div>
        </div>

        {/* CAD Grid Overlays */}
        <div className="hero-cad-grid" aria-hidden="true">
          <div className="grid-cross cross-tl">+</div>
          <div className="grid-cross cross-tr">+</div>
          <div className="grid-cross cross-bl">+</div>
          <div className="grid-cross cross-br">+</div>
          <div className="grid-ruler-top">
            <span>000</span><span>025</span><span>050</span><span>075</span><span>100</span><span>125</span><span>150</span>
          </div>
        </div>

        <div className="hero-content">
          <div className="hero-badge-row">
            <span className="hud-chip accent-volt">
              <svg className="chip-icon" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" fill="currentColor"/></svg>
              FLAGSHIP HARDWARE // REVERSE-ENGINEERED
            </span>
            <span className="hud-chip">VID: 0x248A // PID: 0x8266</span>
            <span className="hud-chip">2.4 GHz SUB-1MS</span>
          </div>

          <h1 className="hero-title">
            <span className="hero-title-line">TACTICAL PRECISION.</span>
            <span className="hero-title-line volt-gradient-text">ZERO BLOATWARE.</span>
          </h1>

          <p className="hero-desc">
            Meet the standalone, instant WebHID driver suite for the <strong>Acer Nitro Phantom X12</strong>. 
            Engineered for esports telemetry, hardware flash calibration, and direct 2.4GHz wireless control without 500MB background services.
          </p>

          {/* Primary Dual-Action CTA Deck */}
          <div className="hero-cta-deck">
            <button
              type="button"
              className="btn-volt-primary"
              onClick={() => {
                sound.boot();
                onLaunchStudio();
              }}
            >
              <span className="btn-glare"></span>
              <span className="btn-chamfer-edge"></span>
              <div className="btn-text-group">
                <span className="btn-label-primary">[ MOUSE CONTROL VIA WEB ]</span>
                <span className="btn-subtext">WEBHID READY // NO INSTALL REQUIRED</span>
              </div>
              <svg className="btn-arrow" viewBox="0 0 18 18" fill="none">
                <path d="M4 9H14M14 9L9.5 4.5M14 9L9.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <a
              href="#support-dev"
              className="btn-tactical-glass"
              onClick={() => sound.click()}
            >
              <div className="diode-pulse"></div>
              <div className="btn-text-group">
                <span className="btn-label-secondary">[ SUPPORT DEV ]</span>
                <span className="btn-subtext">COMMUNITY REVERSE-ENGINEERING</span>
              </div>
            </a>
          </div>

          {/* Quick Jump Bar */}
          <div className="hero-quick-bar">
            <a href="#hardware-details" className="quick-jump-link" onClick={() => sound.click()}>
              <span className="jump-arrow">↓</span> SCROLL FOR HARDWARE TELEMETRY
            </a>
            <span className="quick-sep">/</span>
            <a href="#downloads" className="quick-jump-link" onClick={() => sound.click()}>
              JUMP TO NATIVE DESKTOP DOWNLOADS (.EXE / .APPIMAGE / .DMG)
            </a>
          </div>
        </div>

        {/* Centerpiece Hardware Visual */}
        <div className="hero-visual-stage">
          <div
            className="hero-ambient-halo"
            style={{
              background: `radial-gradient(circle, ${activeColor} 0%, transparent 65%)`,
            }}
          />
          <div ref={heroMouseRef} className="hero-mouse-wrapper">
            <img
              src={`${import.meta.env.BASE_URL}assets/mouse-wireless.webp`}
              alt="Acer Nitro Phantom X12 Wireless Gaming Mouse"
              className="hero-mouse-img"
              width="720"
              height="1234"
            />

            {/* Interactive SVG Glow */}
            <svg className="hero-mouse-svg" viewBox="0 0 720 1234" aria-hidden="true">
              <rect
                x="338"
                y="240"
                width="44"
                height="92"
                rx="14"
                className="svg-wheel-zone"
                style={{ fill: activeColor, filter: `drop-shadow(0 0 10px ${activeColor})` }}
              />
              <rect x="344" y="414" width="32" height="42" rx="8" className="svg-dpi-zone" />
              <g className="svg-palm-mesh">
                <polygon points="360,760 376,770 376,790 360,800 344,790 344,770" className="svg-hex-cell" style={{ fill: activeColor }} />
                <polygon points="320,785 336,795 336,815 320,825 304,815 304,795" className="svg-hex-cell" style={{ fill: activeColor }} />
                <polygon points="400,785 416,795 416,815 400,825 384,815 384,795" className="svg-hex-cell" style={{ fill: activeColor }} />
                <polygon points="360,830 376,840 376,860 360,870 344,860 344,840" className="svg-hex-cell" style={{ fill: activeColor }} />
                <polygon points="280,810 296,820 296,840 280,850 264,840 264,820" className="svg-hex-cell" style={{ fill: activeColor }} />
                <polygon points="440,810 456,820 456,840 440,850 424,840 424,820" className="svg-hex-cell" style={{ fill: activeColor }} />
                <polygon points="320,875 336,885 336,905 320,915 304,905 304,885" className="svg-hex-cell" style={{ fill: activeColor }} />
                <polygon points="400,875 416,885 416,905 400,915 384,905 384,885" className="svg-hex-cell" style={{ fill: activeColor }} />
                <polygon points="360,920 376,930 376,950 360,960 344,950 344,930" className="svg-hex-cell" style={{ fill: activeColor }} />
              </g>
            </svg>
          </div>

          <div className="hero-spec-tag tag-top-right">
            <span className="tag-label">SENSOR ENGINE</span>
            <span className="tag-val">12,000 DPI OPTICAL</span>
          </div>
          <div className="hero-spec-tag tag-bottom-left">
            <span className="tag-label">POLLING FREQUENCY</span>
            <span className="tag-val">1000 HZ / 1.0 MS</span>
          </div>
        </div>
      </section>

      {/* SECTION 2: SCROLLYTELLING HARDWARE BREAKDOWN */}
      <section id="hardware-details" className="hardware-section">
        <div className="section-container">
          <div className="section-title-block">
            <div className="section-eyebrow">
              <span className="accent-pip"></span>
              ABOUT THE HARDWARE &amp; PROTOCOL
            </div>
            <h2 className="section-heading">ENGINEERED FOR UNCOMPROMISING ESPORTS CONTROL.</h2>
            <p className="section-subtext">
              Under the hood of the Acer Phantom X12 lies a high-grade 2.4GHz wireless transceiver and optical tracking engine.
              Explore the pinned hardware telemetry breakdown decoded from raw USB HID descriptor analysis.
            </p>
          </div>

          {/* Pinned Scrollytelling Showcase */}
          <div ref={scrollyPinRef} className="scrolly-showcase" id="scrolly-pin-container">
            <div ref={scrollyVisualRef} className="scrolly-visual-wrap" id="scrolly-visual">
              <div className="scrolly-ambient-halo"></div>
              <img
                src={`${import.meta.env.BASE_URL}assets/mouse-wireless.webp`}
                alt="Acer Nitro Phantom X12 Hardware Breakdown"
                className="scrolly-mouse-img"
              />
              <svg className="scrolly-lines-svg" viewBox="0 0 720 1000" aria-hidden="true">
                <path id="leader-line-1" className="leader-line" d="M360 280 L180 200 L60 200" />
                <circle cx="360" cy="280" r="4" className="leader-anchor" />
                <path id="leader-line-2" className="leader-line" d="M360 520 L540 440 L660 440" />
                <circle cx="360" cy="520" r="4" className="leader-anchor" />
                <path id="leader-line-3" className="leader-line" d="M360 840 L180 760 L60 760" />
                <circle cx="360" cy="840" r="4" className="leader-anchor" />
                <path id="leader-line-4" className="leader-line" d="M360 920 L540 840 L660 840" />
                <circle cx="360" cy="920" r="4" className="leader-anchor" />
              </svg>
            </div>

            <div className="scrolly-cards-stack">
              <div className="scrolly-card" id="scrolly-card-1">
                <div className="card-num">01 // TELEMETRY</div>
                <h3 className="card-title">2.4GHz Sub-1ms Wireless Link</h3>
                <p className="card-desc">
                  Direct receiver communication via WebHID report descriptor <code>VID: 0x248A / PID: 0x8266</code> (and YJX <code>0xA8A5:0x2255</code>). 
                  Operates at true 1000Hz (1.0ms response) with verified bidirectional packet handshakes.
                </p>
                <div className="card-meta">
                  <span className="mono-badge">CMD 0x03 / 0x0E</span>
                  <span className="mono-badge">64-BYTE PACKET</span>
                </div>
              </div>

              <div className="scrolly-card" id="scrolly-card-2">
                <div className="card-num">02 // SENSOR ARRAY</div>
                <h3 className="card-title">12,000 DPI Optical Engine</h3>
                <p className="card-desc">
                  6 customizable onboard sensitivity stages (1,200 to 12,000 DPI) stored directly in non-volatile flash memory. 
                  Cycle stages on-the-fly with zero tracking acceleration and 1:1 pixel fidelity.
                </p>
                <div className="card-meta">
                  <span className="mono-badge">6 STAGES</span>
                  <span className="mono-badge">FLASH PERSISTENT</span>
                </div>
              </div>

              <div className="scrolly-card" id="scrolly-card-3">
                <div className="card-num">03 // LIGHTING CHROMA</div>
                <h3 className="card-title">6-Mode Hardware Chroma Matrix</h3>
                <p className="card-desc">
                  Dedicated onboard lighting processor handling Void, Aurora, Neon Bloom, Comet Rally, Orbit Bounce, Photon Sweep, and Lumen Breath. 
                  No background CPU overhead—the mouse drives animations internally.
                </p>
                <div className="card-meta">
                  <span className="mono-badge">CMD 0x21 VERIFIED</span>
                  <span className="mono-badge">ONBOARD PROCESSOR</span>
                </div>
              </div>

              <div className="scrolly-card" id="scrolly-card-4">
                <div className="card-num">04 // PHILOSOPHY</div>
                <h3 className="card-title">Zero-Bloatware Architecture</h3>
                <p className="card-desc">
                  Why install 500MB proprietary OEM software that spawns telemetry agents and background daemons? 
                  Phantom Device Studio gives you instant, pure WebHID hardware control in under 2MB.
                </p>
                <div className="card-meta">
                  <span className="mono-badge">0 BACKGROUND SERVICES</span>
                  <span className="mono-badge">100% PRIVATE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bento Grid */}
          <div className="bento-grid-header">
            <span className="section-eyebrow">TACTICAL SPEC MATRIX</span>
            <h3 className="bento-heading">HARDWARE SPECIFICATIONS AT A GLANCE</h3>
          </div>

          <div className="tactical-bento-grid">
            <div className="bento-card bento-span-2">
              <div className="bento-spotlight"></div>
              <div className="bento-header">
                <span className="bento-tag">TRANSMISSION RATE</span>
                <span className="bento-stat">1000 HZ / 1.0 MS</span>
              </div>
              <h4 className="bento-title">Ultra-Low Latency Wireless</h4>
              <p className="bento-text">Hardware selectable polling across 125Hz, 250Hz, 500Hz, and 1000Hz with zero jitter smoothing.</p>
              <div className="bento-wave-visual">
                <svg viewBox="0 0 300 40" className="wave-svg">
                  <path d="M0 20 Q 25 5, 50 20 T 100 20 T 150 20 T 200 20 T 250 20 T 300 20" className="wave-path" />
                  <path d="M0 20 Q 25 35, 50 20 T 100 20 T 150 20 T 200 20 T 250 20 T 300 20" className="wave-path wave-alt" />
                </svg>
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-spotlight"></div>
              <div className="bento-header">
                <span className="bento-tag">INTERFACES</span>
                <span className="bento-stat">TRI-MODE</span>
              </div>
              <h4 className="bento-title">Tri-Mode Flexibility</h4>
              <p className="bento-text">2.4GHz Dongle (WebHID verified), Type-C Braided Tether, and Low-Energy Bluetooth.</p>
              <div className="bento-pills-row">
                <span className="micro-pill active">2.4 GHz</span>
                <span className="micro-pill">USB-C</span>
                <span className="micro-pill">BT 5.2</span>
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-spotlight"></div>
              <div className="bento-header">
                <span className="bento-tag">STORAGE</span>
                <span className="bento-stat">FLASH EEPROM</span>
              </div>
              <h4 className="bento-title">Hardware Memory Persistence</h4>
              <p className="bento-text">Write your settings once via browser; take your mouse to any tournament PC without installing software.</p>
            </div>

            <div className="bento-card bento-span-2">
              <div className="bento-spotlight"></div>
              <div className="bento-header">
                <span className="bento-tag">REVERSE-ENGINEERING</span>
                <span className="bento-stat volt-text">VERIFIED &amp; AUDITED</span>
              </div>
              <h4 className="bento-title">Open Protocol Transparency</h4>
              <p className="bento-text">Zero undocumented writes. Every command byte is logged and validated against physical receiver responses.</p>
              <div className="protocol-bar-wrap">
                <div className="protocol-bar-fill" style={{ width: '78%' }}></div>
                <div className="protocol-bar-labels">
                  <span>LIGHTING &amp; TELEMETRY: 100%</span>
                  <span>BUTTON PACKETS: IN PROGRESS</span>
                </div>
              </div>
            </div>

            <div className="bento-card">
              <div className="bento-spotlight"></div>
              <div className="bento-header">
                <span className="bento-tag">WEIGHT CLASS</span>
                <span className="bento-stat">~65 GRAMS</span>
              </div>
              <h4 className="bento-title">Featherweight Chassis</h4>
              <p className="bento-text">Engineered honeycomb structural rigidity for lightning flick shots and reduced wrist fatigue.</p>
            </div>

            <div className="bento-card">
              <div className="bento-spotlight"></div>
              <div className="bento-header">
                <span className="bento-tag">SWITCHES</span>
                <span className="bento-stat">80M CLICKS</span>
              </div>
              <h4 className="bento-title">Tactile Crisp Actuation</h4>
              <p className="bento-text">Gold-plated contact micro-switches providing zero double-click debounce issues.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: SUPPORT THE DEVELOPER */}
      <section id="support-dev" className="support-section">
        <div className="section-container">
          <div className="manifesto-card">
            <div className="manifesto-header">
              <div className="manifesto-badge">
                <span className="blinking-dot"></span>
                COMMUNITY REVERSE-ENGINEERING INITIATIVE
              </div>
              <span className="manifesto-meta">DOC ID: REV-ENG-248A // PUBLIC DOMAIN</span>
            </div>

            <h2 className="manifesto-title">
              "PROPRIETARY HARDWARE SHOULD NOT REQUIRE COMPROMISED SOFTWARE."
            </h2>

            <div className="manifesto-grid">
              <div className="manifesto-body">
                <p>
                  Many gaming peripherals ship with opaque, bloat-laden utilities—often poorly translated, tracking user telemetry, or requiring background memory footprints exceeding modern text editors.
                </p>
                <p>
                  <strong>Phantom Device Studio</strong> was created by independently sniffing raw USB HID packets on the Acer Phantom X12 receiver (<code>VID: 0x248A / PID: 0x8266</code>). By decoding report queries <code>0x03</code>, <code>0x0E</code>, and lighting write <code>0x21</code>, we proved that browser-native WebHID can configure high-tier hardware with 100% transparency.
                </p>
                <p>
                  Your support directly accelerates decoding the remaining unmapped packets for on-device button remapping and macro chunks!
                </p>
              </div>

              <div className="manifesto-actions">
                <div className="action-card">
                  <div className="action-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                  </div>
                  <div className="action-details">
                    <h4>Star &amp; Fork on GitHub</h4>
                    <p>Inspect the complete open-source code and report descriptors.</p>
                    <div className="copy-terminal-box">
                      <code>git clone https://github.com/sonesh-2202/Acer_Phantom_X12_Software.git</code>
                      <button type="button" className="copy-btn" id="copy-git-btn" onClick={copyGit}>COPY</button>
                    </div>
                  </div>
                </div>

                <div className="action-card">
                  <div className="action-icon volt-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <div className="action-details">
                    <h4>Support Independent Dev</h4>
                    <p>Help fund hardware test benches and USB protocol analyzers.</p>
                    <button
                      type="button"
                      className="btn-patronage"
                      onClick={() => {
                        sound.click();
                        onOpenPatronage();
                      }}
                    >
                      <span>SPONSOR HARDWARE RESEARCH</span>
                      <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a.75.75 0 0 1 .75.75v8.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V2.75A.75.75 0 0 1 8 2z"/></svg>
                    </button>
                  </div>
                </div>

                <div className="action-card">
                  <div className="action-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 17l6-6-6-6M12 19h8"/></svg>
                  </div>
                  <div className="action-details">
                    <h4>Submit USB Packet Captures</h4>
                    <p>Follow our passive Wireshark / WebHID guide to capture button sequences.</p>
                    <a
                      href="https://github.com/sonesh-2202/Acer_Phantom_X12_Software/blob/main/docs/webhid_capture_instructions.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-link-action"
                    >
                      READ CAPTURE GUIDE →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: NATIVE DOWNLOADS DOCK */}
      <section id="downloads" className="downloads-section">
        <div className="section-container">
          <div className="zero-install-banner">
            <div className="banner-badge">WEB-FIRST ADVANTAGE</div>
            <p className="banner-text">
              Running Chrome, Edge, or Brave? You don't even need to download—launch{' '}
              <button
                type="button"
                className="inline-launch-btn"
                onClick={() => {
                  sound.boot();
                  onLaunchStudio();
                }}
              >
                [Mouse Control via Web]
              </button>{' '}
              above for instant zero-install configuration.
            </p>
          </div>

          <div className="downloads-header">
            <div className="section-eyebrow">STANDALONE OFFLINE UTILITIES</div>
            <h2 className="section-heading">NATIVE DESKTOP BINARIES // HARDWARE SERVER RACK</h2>
            <p className="section-subtext">
              Prefer a permanent offline installation without opening a browser? Download self-contained native builds compiled with zero background daemons.
            </p>
          </div>

          <div className="server-rack-grid">
            {/* Bay 1: Windows */}
            <div className="rack-card" data-os="win">
              <div className="rack-spotlight"></div>
              <div className="rack-top">
                <div className="os-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.901-1.799"/>
                  </svg>
                </div>
                <div className="rack-meta-head">
                  <span className="rack-badge">NATIVE INSTALLER &amp; PORTABLE</span>
                  <span className="rack-version">v2.4.0-stable</span>
                </div>
              </div>
              <h3 className="rack-os-title">WINDOWS (x64)</h3>
              <p className="rack-os-desc">Windows 10 / 11 64-bit • Direct HID Driver Bypass • Zero Background Services</p>
              <a
                href="https://github.com/sonesh-2202/Acer_Phantom_X12_Software/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="rack-download-btn"
                onClick={() => sound.click()}
              >
                <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a.75.75 0 0 1 .75.75v8.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V2.75A.75.75 0 0 1 8 2z"/></svg>
                <span>DOWNLOAD .EXE (Windows)</span>
              </a>
              <div className="rack-tech-note">
                <code>Phantom-Studio-Setup-x64.exe (18.4 MB)</code>
              </div>
              <details className="rack-drawer">
                <summary>Verify SHA-256 Checksum &amp; Notes</summary>
                <div className="drawer-content">
                  <span className="mono-hash">SHA256: 4f8b91a27e6c5d33e0...</span>
                  <p>Includes digital checksum verification and portable fallback executable.</p>
                </div>
              </details>
            </div>

            {/* Bay 2: Linux */}
            <div className="rack-card" data-os="linux">
              <div className="rack-spotlight"></div>
              <div className="rack-top">
                <div className="os-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.5 2 6 5 6 9c0 2.5 1 5 1 8 0 1.5-1 2-2 2h14c-1 0-2-.5-2-2 0-3 1-5.5 1-8 0-4-2.5-7-6-7zm-2 7a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zm4 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zm-2 3c1.5 0 2.5 1 2.5 1s-1 1-2.5 1-2.5-1-2.5-1 1-1 2.5-1z"/>
                  </svg>
                </div>
                <div className="rack-meta-head">
                  <span className="rack-badge">UNIVERSAL LINUX BINARY</span>
                  <span className="rack-version">v2.4.0-stable</span>
                </div>
              </div>
              <h3 className="rack-os-title">LINUX (x86_64 / ARM64)</h3>
              <p className="rack-os-desc">Universal .AppImage • Direct libusb / hidraw access without root</p>
              <a
                href="https://github.com/sonesh-2202/Acer_Phantom_X12_Software/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="rack-download-btn"
                onClick={() => sound.click()}
              >
                <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a.75.75 0 0 1 .75.75v8.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V2.75A.75.75 0 0 1 8 2z"/></svg>
                <span>DOWNLOAD .AppImage</span>
              </a>
              <div className="terminal-copy-snippet">
                <code>chmod +x Phantom*.AppImage &amp;&amp; ./Phantom*.AppImage</code>
                <button type="button" className="snippet-copy-btn" id="copy-linux-cmd" onClick={copyLinux}>COPY</button>
              </div>
              <details className="rack-drawer">
                <summary>udev rules for 248A:8266 permissions</summary>
                <div className="drawer-content">
                  <pre className="udev-box"><code>SUBSYSTEM=="hidraw", ATTRS&#123;idVendor&#125;=="248a", ATTRS&#123;idProduct&#125;=="8266", MODE="0666"</code></pre>
                </div>
              </details>
            </div>

            {/* Bay 3: macOS */}
            <div className="rack-card" data-os="mac">
              <div className="rack-spotlight"></div>
              <div className="rack-top">
                <div className="os-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.77 1.06-1.85.94-2.93-.93.04-2.09.62-2.74 1.39-.58.67-1.09 1.77-.95 2.83 1.05.08 2.12-.52 2.75-1.29z"/>
                  </svg>
                </div>
                <div className="rack-meta-head">
                  <span className="rack-badge">UNIVERSAL MAC PACKAGE</span>
                  <span className="rack-version">v2.4.0-stable</span>
                </div>
              </div>
              <h3 className="rack-os-title">macOS (Apple Silicon &amp; Intel)</h3>
              <p className="rack-os-desc">Native Metal UI Acceleration • Universal binary for M1/M2/M3/M4 &amp; Intel Macs</p>
              <a
                href="https://github.com/sonesh-2202/Acer_Phantom_X12_Software/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="rack-download-btn"
                onClick={() => sound.click()}
              >
                <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a.75.75 0 0 1 .75.75v8.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V2.75A.75.75 0 0 1 8 2z"/></svg>
                <span>DOWNLOAD .DMG (macOS)</span>
              </a>
              <div className="rack-tech-note">
                <code>Phantom-Studio-Universal.dmg (21.2 MB)</code>
              </div>
              <details className="rack-drawer">
                <summary>macOS IOHIDFamily Notes</summary>
                <div className="drawer-content">
                  <p>Sandboxed IOKit driver. Grant input monitoring permission in System Settings if prompted.</p>
                </div>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* Landing Footer */}
      <footer className="landing-footer">
        <div className="section-container footer-row">
          <div className="footer-left">
            <span className="footer-brand">PHANTOM DEVICE STUDIO</span>
            <span className="footer-tagline">Open-source hardware configurator for Acer Nitro Phantom X12</span>
          </div>
          <div className="footer-center">
            <button type="button" className="footer-link-btn" onClick={() => onOpenLegal()}>Privacy Policy</button>
            <span className="dot-sep">•</span>
            <button type="button" className="footer-link-btn" onClick={() => onOpenLegal()}>Terms of Service</button>
            <span className="dot-sep">•</span>
            <a href="https://github.com/sonesh-2202/Acer_Phantom_X12_Software" target="_blank" rel="noopener noreferrer" className="footer-link-btn">GitHub Repository</a>
          </div>
          <div className="footer-right">
            <span className="version-tag">BUILD v2.4 // 2026.11</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
