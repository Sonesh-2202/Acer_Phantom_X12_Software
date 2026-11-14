import React, { useState, useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { sound } from './utils/audio';
import {
  FILTER,
  POLLING,
  EFFECTS,
  queryDevice,
  buildLightingPacket,
  waitForCommand,
  isVendorDevice,
  findVendorDevice,
} from './utils/webhid';
import { LandingPage } from './components/LandingPage';
import { StudioCockpit } from './components/StudioCockpit';
import { PatronageModal } from './components/PatronageModal';
import { LegalModal } from './components/LegalModal';

gsap.registerPlugin(ScrollTrigger);

export function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'studio'
  const [device, setDevice] = useState(null);
  const [connected, setConnected] = useState(false);
  const [battery, setBattery] = useState(59);
  const [chargeStatus, setChargeStatus] = useState('ON BATTERY');
  const [activeStage, setActiveStage] = useState(1);
  const [activeDpi, setActiveDpi] = useState(1200);
  const [activePolling, setActivePolling] = useState(1000);
  const [stages, setStages] = useState([1200, 2400, 3200, 4800, 8000, 12000]);
  const [selectedEffect, setSelectedEffect] = useState(0);
  const [activeColor, setActiveColor] = useState('#A3FF12');
  const [toastMessage, setToastMessage] = useState(null);
  const [edgeFlash, setEdgeFlash] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [isPatronageOpen, setIsPatronageOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [savedScenes, setSavedScenes] = useState([]);

  const lenisRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  // Initialize Lenis smooth scroll and sync with GSAP ticker & ScrollTrigger
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
      wheelMultiplier: 1.0,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);
    const tickHandler = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickHandler);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tickHandler);
      lenis.destroy();
    };
  }, []);

  // Load saved scenes from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('phantom-scenes');
      if (stored) setSavedScenes(JSON.parse(stored));
      const storedTheme = localStorage.getItem('phantom-theme');
      if (storedTheme) {
        setTheme(storedTheme);
        document.documentElement.setAttribute('data-theme', storedTheme);
      }
    } catch {
      // Local storage unavailable fallback
    }
  }, []);

  // Update dynamic CSS ambient glow variable
  useEffect(() => {
    document.documentElement.style.setProperty('--active-rgb-glow', activeColor);
  }, [activeColor]);

  // Toast helper
  const showToast = (msg) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3600);
  };

  // Screen-edge flash helper
  const triggerEdgeFlash = () => {
    setEdgeFlash(true);
    setTimeout(() => setEdgeFlash(false), 240);
  };

  // Theme toggle
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('phantom-theme', next);
    } catch {}
  };

  // Battery event handler
  const handleBatteryUpdate = (level, chargeFlag) => {
    if (!Number.isFinite(level) || level < 0 || level > 100) return;
    setBattery(level);
    setChargeStatus(chargeFlag ? 'CHARGING' : 'ON BATTERY');
  };

  // Profile parser for report 0xAA 0x0E
  const handleApplyProfile = (bytes) => {
    if (bytes.length < 25 || bytes[0] !== 0xAA || bytes[1] !== 0x0E) {
      throw new Error('Unexpected DPI profile structure from receiver.');
    }
    const newStages = [];
    for (let offset = 13; offset < 25; offset += 2) {
      newStages.push(bytes[offset] | (bytes[offset + 1] << 8));
    }
    const active = bytes[12];
    const pollRate = POLLING[bytes[10]] || 1000;
    const mode = bytes[9];

    setStages(newStages);
    setActiveStage(active);
    setActiveDpi(newStages[active - 1] || 1200);
    setActivePolling(pollRate);
    setSelectedEffect(mode);

    const eff = EFFECTS.find((e) => e.id === mode);
    if (eff) setActiveColor(eff.hex);
  };

  // Input report handler
  const handleInputReport = (event) => {
    const bytes = Array.from(new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength));
    if (bytes.length < 2 || bytes[0] !== 0xAA) return;

    if (bytes[1] === 0xFA) {
      // 0xD0: Battery report
      if (bytes.length > 10 && bytes[8] === 0xD0) {
        handleBatteryUpdate(bytes[9], bytes[10]);
      }
      // 0xAE: Hardware DPI toggle or polling report
      else if (bytes.length > 10 && bytes[2] === 0xAE) {
        const stage = bytes[9];
        const rate = bytes[10];
        if (stage >= 1 && stage <= stages.length) {
          setActiveStage(stage);
          setActiveDpi(stages[stage - 1]);
        }
        if (POLLING[rate]) {
          setActivePolling(POLLING[rate]);
        }
        triggerEdgeFlash();
        sound.ack();
      }
    }
  };

  const deviceRef = useRef(null);
  useEffect(() => {
    deviceRef.current = device;
  }, [device]);

  // Disconnect WebHID
  const disconnectDevice = async () => {
    const currentDev = deviceRef.current;
    if (currentDev && currentDev.opened) {
      try {
        await currentDev.close();
      } catch (err) {
        console.warn(err);
      }
    }
    setDevice(null);
    setConnected(false);
    sound.toggle();
    showToast('Hardware receiver disconnected.');
  };

  // Load state from hardware with pacing and non-fatal query timeouts
  const loadHardwareState = async (dev) => {
    try {
      // 1. Query 0x03 (Model/Firmware identification)
      try {
        await queryDevice(dev, 0x03, 1200);
      } catch (e3) {
        console.warn('[Phantom WebHID] Query 0x03 skipped or delayed:', e3);
      }

      // Small inter-query pacing delay for receiver buffer
      await new Promise((r) => setTimeout(r, 60));

      // 2. Query 0x0E (Active DPI profile & polling rate)
      try {
        const profile = await queryDevice(dev, 0x0E, 1400);
        handleApplyProfile(profile);
      } catch (eE) {
        console.warn('[Phantom WebHID] Query 0x0E skipped or delayed:', eE);
      }

      sound.boot();
      triggerEdgeFlash();
      showToast('Receiver profile loaded (2.4 GHz Link active).');
    } catch (err) {
      console.warn('[Phantom WebHID] Notice during loadHardwareState:', err);
    }
  };

  // Attach an HID device collection and configure event handlers
  const attachDevice = async (dev, isAuto = false) => {
    try {
      if (!dev.opened) {
        await dev.open();
      }

      // Remove any prior listener if present
      try {
        dev.removeEventListener('inputreport', handleInputReport);
        dev.removeEventListener('disconnect', disconnectDevice);
      } catch {}

      dev.addEventListener('inputreport', handleInputReport);
      dev.addEventListener('disconnect', disconnectDevice);

      setDevice(dev);
      setConnected(true);
      showToast(
        isAuto
          ? `Auto-connected to ${dev.productName || 'Acer Phantom X12 Receiver'}`
          : `Connected to ${dev.productName || 'Acer Phantom X12 Receiver'}`
      );

      if (!isAuto && currentView !== 'studio') {
        transitionToStudio();
      }

      await loadHardwareState(dev);
    } catch (error) {
      console.error('[Phantom WebHID] attachDevice error:', error);
      if (!isAuto) {
        showToast(error.message || 'Could not initialize receiver.');
      }
    }
  };

  // Auto-connect on load and listen for USB plug / unplug events
  useEffect(() => {
    if (!window.isSecureContext || !navigator.hid) return;

    // Check if user already authorized device in a previous session
    navigator.hid
      .getDevices()
      .then((devices) => {
        const vendorDev = findVendorDevice(devices);
        if (vendorDev) {
          console.log('[Phantom WebHID] Found previously authorized device, auto-connecting...', vendorDev);
          attachDevice(vendorDev, true);
        }
      })
      .catch((err) => {
        console.warn('[Phantom WebHID] getDevices error:', err);
      });

    const onConnect = (event) => {
      console.log('[Phantom WebHID] USB plug event detected:', event.device);
      if (isVendorDevice(event.device)) {
        attachDevice(event.device, true);
      }
    };

    const onDisconnect = (event) => {
      console.log('[Phantom WebHID] USB unplug event detected:', event.device);
      if (deviceRef.current && event.device === deviceRef.current) {
        disconnectDevice();
      }
    };

    navigator.hid.addEventListener('connect', onConnect);
    navigator.hid.addEventListener('disconnect', onDisconnect);

    return () => {
      navigator.hid.removeEventListener('connect', onConnect);
      navigator.hid.removeEventListener('disconnect', onDisconnect);
    };
  }, []);

  // Connect WebHID (User initiated via click)
  const connectDevice = async () => {
    if (!window.isSecureContext) {
      showToast(`WebHID needs a secure page. This page is ${window.location.origin}. Open the app at http://localhost:5173/ or its HTTPS GitHub Pages address.`);
      return;
    }
    if (!navigator.hid) {
      showToast('This browser does not expose WebHID. Open this page directly in Chrome or Edge (not Firefox, Safari, or an embedded browser).');
      return;
    }

    try {
      // Keep this as the first awaited operation: requestDevice requires the
      // transient user activation from the Connect button click.
      const devices = await navigator.hid.requestDevice({ filters: FILTER });
      if (!devices || devices.length === 0) return;

      const selectedDev = findVendorDevice(devices);
      if (!selectedDev) {
        showToast('The selected device is not the supported YJX receiver collection (A8A5:2255).');
        return;
      }
      await attachDevice(selectedDev, false);
    } catch (error) {
      console.error('[Phantom WebHID] requestDevice error:', error);
      if (error.name !== 'NotFoundError') {
        showToast(`${error.name || 'Connection error'}: ${error.message || 'Could not connect to receiver.'}`);
      }
    }
  };

  // Apply lighting effect
  const applyEffectToHardware = async () => {
    if (!device) {
      showToast('Connect the 2.4 GHz USB receiver first.');
      return;
    }
    const eff = EFFECTS.find((e) => e.id === selectedEffect);
    if (!eff) return;

    try {
      if (!device.opened) {
        await device.open();
      }
      const pending = waitForCommand(device, 0x21, 1500).catch((err) => {
        console.warn('[Phantom WebHID] Lighting command 0x21 ack timed out, proceeding:', err);
      });
      await device.sendReport(0, buildLightingPacket(eff.id));
      await pending;

      triggerEdgeFlash();
      sound.ack();
      showToast(`Command 0x0${eff.id} written: ${eff.name} applied on hardware.`);
    } catch (error) {
      console.error(error);
      showToast(`Write error: ${error.message}`);
    }
  };

  // View Transitions
  const transitionToStudio = () => {
    sound.boot();
    setCurrentView('studio');
    window.location.hash = '#overview';
    if (lenisRef.current) lenisRef.current.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  };

  const transitionToLanding = () => {
    sound.click();
    setCurrentView('landing');
    window.location.hash = '#hero-stage';
    if (lenisRef.current) lenisRef.current.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
    setTimeout(() => ScrollTrigger.refresh(), 100);
  };

  // Check URL hash on initial load
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (['overview', 'lighting', 'performance', 'buttons', 'macros', 'about'].includes(hash)) {
      setCurrentView('studio');
    }
  }, []);

  return (
    <div className="relative min-h-screen text-white bg-bg-void">
      {/* Dynamic Ambient Reactive Backlight */}
      <div
        className="ambient-glow-layer"
        style={{
          background: `radial-gradient(circle 800px at 50% 30%, ${activeColor}40 0%, transparent 70%)`,
        }}
      />

      {/* Screen Edge Acknowledgment Flash */}
      <div className={`screen-edge-flash ${edgeFlash ? 'flash-active' : ''}`} />

      {/* VIEW 1: LANDING PAGE */}
      {currentView === 'landing' ? (
        <LandingPage
          onLaunchStudio={transitionToStudio}
          onConnectReceiver={connected ? disconnectDevice : connectDevice}
          onOpenPatronage={() => setIsPatronageOpen(true)}
          onOpenLegal={() => setIsLegalOpen(true)}
          connected={connected}
          battery={battery}
          activeEffect={selectedEffect}
          activeColor={activeColor}
        />
      ) : (
        /* VIEW 2: PHANTOM DEVICE STUDIO COCKPIT */
        <StudioCockpit
          connected={connected}
          onConnectToggle={connected ? disconnectDevice : connectDevice}
          onReturnToLanding={transitionToLanding}
          onApplyEffect={applyEffectToHardware}
          battery={battery}
          chargeStatus={chargeStatus}
          activeStage={activeStage}
          activeDpi={activeDpi}
          activePolling={activePolling}
          stages={stages}
          onSelectStageDpi={(stageNum) => {
            setActiveStage(stageNum);
            setActiveDpi(stages[stageNum - 1]);
          }}
          selectedEffect={selectedEffect}
          onSelectEffect={(effectId) => {
            setSelectedEffect(effectId);
            const eff = EFFECTS.find((e) => e.id === effectId);
            if (eff) setActiveColor(eff.hex);
          }}
          activeColor={activeColor}
          onChangeColor={setActiveColor}
          savedScenes={savedScenes}
          onSaveScene={(newScene) => {
            const updated = [...savedScenes, newScene];
            setSavedScenes(updated);
            try {
              localStorage.setItem('phantom-scenes', JSON.stringify(updated));
            } catch {}
            showToast('Scene saved locally in browser storage.');
          }}
          onLoadScene={(sc) => {
            setActiveColor(sc.color);
            showToast(`Loaded ${sc.name}`);
          }}
          onOpenPatronage={() => setIsPatronageOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}

      {/* MODALS */}
      <PatronageModal
        isOpen={isPatronageOpen}
        onClose={() => setIsPatronageOpen(false)}
      />
      <LegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
      />

      {/* HUD TOAST NOTIFICATION */}
      <div className={`hud-toast ${toastMessage ? 'show' : ''}`}>
        {toastMessage}
      </div>
    </div>
  );
}
