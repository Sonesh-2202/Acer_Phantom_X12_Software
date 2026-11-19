import React, { useRef } from 'react';
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

      // 3. Pinned hardware image
      if (scrollyPinRef.current && scrollyVisualRef.current) {
        ScrollTrigger.create({
          trigger: scrollyPinRef.current,
          start: 'top 120px',
          end: '+=1000',
          pin: scrollyVisualRef.current,
          scrub: true,
        });

      }
    },
    { scope: containerRef }
  );

  const copyGit = () => {
    sound.ack();
    navigator.clipboard.writeText('git clone https://github.com/sonesh-2202/Acer_Phantom_X12_Software.git');
    const btn = document.getElementById('copy-git-btn');
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
              <span className="brand-subtitle">MOUSE CONTROL</span>
            </div>
          </a>

          <nav className="landing-nav" aria-label="Product Navigation">
            <a href="#hero-stage" className="landing-nav-link active" onClick={() => sound.click()}>LAUNCHPAD</a>
            <a href="#hardware-details" className="landing-nav-link" onClick={() => sound.click()}>DETAILS &amp; SPECS</a>
            <a href="#support-dev" className="landing-nav-link" onClick={() => sound.click()}>OPEN PROTOCOL</a>
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
            <span>PHANTOM X12 · WIRELESS · 1000 HZ · 12,000 DPI · </span>
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
          <h1 className="hero-title">
            <span className="hero-title-line">TACTICAL PRECISION.</span>
            <span className="hero-title-line volt-gradient-text">ZERO BLOATWARE.</span>
          </h1>

          <p className="hero-desc">
            Control the <strong>Acer Nitro Phantom X12</strong> from your browser. Adjust sensitivity, polling rate, lighting, and battery settings in one place.
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
                <span className="btn-subtext">OPEN MOUSE CONTROLS</span>
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
              src={`${import.meta.env.BASE_URL}assets/mouse-wired.webp`}
              alt="Acer Nitro Phantom X12 Wireless Gaming Mouse"
              className="hero-mouse-img"
              width="720"
              height="1234"
            />

          </div>

          <div className="hero-spec-tag tag-top-right">
            <span className="tag-label">SENSOR ENGINE</span>
            <span className="tag-val">12,000 DPI OPTICAL</span>
          </div>
          <div className="hero-spec-tag tag-bottom-left">
            <span className="tag-label">POLLING FREQUENCY</span>
            <span className="tag-val">PROFILE: 1000 HZ</span>
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
                src={`${import.meta.env.BASE_URL}assets/mouse-wired.webp`}
                alt="Acer Nitro Phantom X12 Hardware Breakdown"
                className="scrolly-mouse-img"
              />
            </div>

            <div className="scrolly-cards-stack">
              <div className="scrolly-card" id="scrolly-card-1">
                <div className="card-num">01 · CONNECTION</div>
                <h3 className="card-title">2.4 GHz Receiver Link</h3>
                <p className="card-desc">
                  Connect to the YJX 2.4 GHz receiver to view and adjust the mouse profile. The receiver currently reports a 1000 Hz polling rate.
                </p>
                <div className="card-meta">
                  <span className="mono-badge">2.4 GHz WIRELESS</span>
                  <span className="mono-badge">1000 Hz POLLING</span>
                </div>
              </div>

              <div className="scrolly-card" id="scrolly-card-2">
                <div className="card-num">02 · SENSITIVITY</div>
                <h3 className="card-title">Six-Stage DPI Profile</h3>
                <p className="card-desc">
                  The receiver reports six stages from 1,200 to 12,000 DPI. This app reads the active profile; writing customized DPI values is not enabled yet.
                </p>
                <div className="card-meta">
                  <span className="mono-badge">6 REPORTED STAGES</span>
                  <span className="mono-badge">PROFILE READ</span>
                </div>
              </div>

              <div className="scrolly-card" id="scrolly-card-3">
                <div className="card-num">03 · LIGHTING</div>
                <h3 className="card-title">Seven Onboard Lighting Modes</h3>
                <p className="card-desc">
                  The seven onboard modes were observed on this mouse. Custom color packets and independent ARGB zones have not been identified.
                </p>
                <div className="card-meta">
                  <span className="mono-badge">USER-OBSERVED MODES</span>
                  <span className="mono-badge">CUSTOM COLOR UNKNOWN</span>
                </div>
              </div>

              <div className="scrolly-card" id="scrolly-card-4">
                <div className="card-num">04 · ABOUT</div>
                <h3 className="card-title">Zero-Bloatware Architecture</h3>
                <p className="card-desc">
                  The control panel runs in a browser and uses WebHID for the confirmed 2.4 GHz receiver. No native driver or background service is part of this project.
                </p>
                <div className="card-meta">
                  <span className="mono-badge">0 BACKGROUND SERVICES</span>
                  <span className="mono-badge">NO DEVICE TELEMETRY</span>
                </div>
              </div>
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
              <span className="manifesto-meta">RECEIVER RESEARCH</span>
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
                  <strong>Phantom Device Studio</strong> works with the YJX 2.4 GHz receiver used with the Acer Phantom X12. It manages sensitivity, polling rate, battery status, and the mouse’s built-in lighting modes.
                </p>
                <p>
                  Your support helps improve device compatibility and test future features.
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

              </div>
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
            <span className="version-tag">DEVICE READY</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
