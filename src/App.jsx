import React, { useState, useEffect, useRef, useCallback } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { sound } from './utils/audio';
import {
  FILTER,
  WIRED_FILTER,
  BLUETOOTH_HID_FILTER,
  POLLING,
  EFFECTS,
  DEFAULT_PROFILE,
  queryDevice,
  buildLightingPacket,
  writeProfileToHardware,
  waitForCommand,
  isVendorDevice,
  isWiredDevice,
  isBluetoothHidDevice,
  findVendorDevice,
  parseProfileReport,
  parseInputReport,
  validateProfile,
} from './utils/webhid';
import { LandingPage } from './components/LandingPage';
import { StudioCockpit } from './components/StudioCockpit';
import { PatronageModal } from './components/PatronageModal';
import { LegalModal } from './components/LegalModal';

gsap.registerPlugin(ScrollTrigger);

const INITIAL_PROFILES = [
  {
    id: 'default',
    name: 'Tactical Baseline (1000Hz)',
    pollingRate: 1000,
    activeStage: 1,
    stages: [1200, 2400, 3200, 4800, 6400, 12000],
    selectedEffect: 0,
    activeColor: '#A3FF12',
    speed: 50,
    brightness: 75,
  },
];

export function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'studio'
  const [device, setDevice] = useState(null);
  const [connected, setConnected] = useState(false);
  const [wiredConnected, setWiredConnected] = useState(false);
  const [wiredControlReady, setWiredControlReady] = useState(false);
  const [bluetoothConnected, setBluetoothConnected] = useState(false);
  const [bluetoothHidConnected, setBluetoothHidConnected] = useState(false);
  const [bluetoothHidControlReady, setBluetoothHidControlReady] = useState(false);

  // Real telemetry battery state (no hardcoded initial fake percentage)
  const [battery, setBattery] = useState(null);
  const [chargeStatus, setChargeStatus] = useState('UNKNOWN');
  const [batteryTelemetryStatus, setBatteryTelemetryStatus] = useState('unavailable'); // 'unavailable' | 'waiting' | 'live' | 'stale'

  // Performance telemetry state
  const [activeStage, setActiveStage] = useState(1);
  const [activeDpi, setActiveDpi] = useState(1200);
  const [activePolling, setActivePolling] = useState(1000);
  const [stages, setStages] = useState([1200, 2400, 3200, 4800, 6400, 12000]);
  const stagesRef = useRef(stages);
  stagesRef.current = stages;
  const [hardwareProfile, setHardwareProfile] = useState(null);
  const [isApplyingProfile, setIsApplyingProfile] = useState(false);

  // Lighting state
  const [selectedEffect, setSelectedEffect] = useState(0);
  const [activeColor, setActiveColor] = useState('#A3FF12');
  const [isApplyingLighting, setIsApplyingLighting] = useState(false);

  // Profiles state
  const [profiles, setProfiles] = useState(INITIAL_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState('default');

  // UI state
  const [toastMessage, setToastMessage] = useState(null);
  const [edgeFlash, setEdgeFlash] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [isPatronageOpen, setIsPatronageOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);

  const lenisRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const lastBatteryTimestampRef = useRef(null);
  const batteryValueRef = useRef(null);
  const pendingBatterySampleRef = useRef(null);
  const batterySourceRef = useRef(null);
  const bluetoothDeviceRef = useRef(null);
  const bluetoothDisconnectListenerRef = useRef(null);
  const batteryCharacteristicRef = useRef(null);
  const bluetoothBatteryListenerRef = useRef(null);
  const bluetoothHidDeviceRef = useRef(null);
  const bluetoothHidInputListenerRef = useRef(null);
  const deviceRef = useRef(null);
  const wiredDeviceRef = useRef(null);
  const wiredInputListenerRef = useRef(null);
  const rawBaseProfileBytesRef = useRef(null);

  useEffect(() => {
    deviceRef.current = device;
  }, [device]);

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

  // Load saved local storage states on boot
  useEffect(() => {
    try {
      const storedScenes = localStorage.getItem('phantom-scenes');
      if (storedScenes) setSavedScenes(JSON.parse(storedScenes));

      const storedProfiles = localStorage.getItem('phantom-profiles');
      if (storedProfiles) setProfiles(JSON.parse(storedProfiles));

      const storedTheme = localStorage.getItem('phantom-theme');
      if (storedTheme) {
        setTheme(storedTheme);
        document.documentElement.setAttribute('data-theme', storedTheme);
      }
    } catch (e) {
      console.warn('[Phantom Studio] Local storage load notice:', e);
    }
  }, []);

  // Update dynamic CSS ambient glow variable
  useEffect(() => {
    document.documentElement.style.setProperty('--active-rgb-glow', activeColor);
  }, [activeColor]);

  // Check for stale battery telemetry (warn if no report within 45s of active link)
  useEffect(() => {
    const timer = setInterval(() => {
      if ((connected || wiredConnected || bluetoothConnected || bluetoothHidConnected) && lastBatteryTimestampRef.current) {
        const elapsed = Date.now() - lastBatteryTimestampRef.current;
        if (elapsed > 45000) {
          setBatteryTelemetryStatus('stale');
        }
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [connected, wiredConnected, bluetoothConnected, bluetoothHidConnected]);

  // Toast helper
  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3800);
  }, []);

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

  // Battery update handler
  const handleBatteryUpdate = (level, chargeFlag, source = 'receiver') => {
    if (!Number.isFinite(level) || level < 0 || level > 100) return;
    // Receiver reports can contain one-off percentage spikes. Show the first
    // real reading immediately, then require a second consecutive matching
    // report before changing the displayed percentage.
    const displayedBattery = batteryValueRef.current;
    if (displayedBattery === null) {
      batteryValueRef.current = level;
      setBattery(level);
      pendingBatterySampleRef.current = null;
    } else if (level === displayedBattery) {
      pendingBatterySampleRef.current = null;
    } else {
      const pending = pendingBatterySampleRef.current;
      if (pending?.level === level) {
        batteryValueRef.current = level;
        pendingBatterySampleRef.current = null;
        setBattery(level);
      } else {
        pendingBatterySampleRef.current = { level };
      }
    }
    batterySourceRef.current = source;
    setChargeStatus(chargeFlag === null ? 'NOT REPORTED' : chargeFlag ? 'CHARGING' : 'ON BATTERY');
    setBatteryTelemetryStatus('live');
    lastBatteryTimestampRef.current = Date.now();
  };

  // Handle incoming hardware input reports
  const handleInputReport = (event, source = 'receiver') => {
    const bytes = Array.from(new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength));
    const parsed = parseInputReport(bytes);
    if (!parsed) return;

    if (parsed.type === 'battery') {
      handleBatteryUpdate(parsed.level, parsed.charging, source);
    } else if (parsed.type === 'dpi_toggle') {
      if (!['receiver', 'wired', 'bluetoothHid'].includes(source)) return;
      const stageDpi = stagesRef.current[parsed.stage - 1];
      if (parsed.stage >= 1 && parsed.stage <= stages.length) {
        setActiveStage(parsed.stage);
        setActiveDpi(stageDpi);
      }
      if (parsed.pollingRate) {
        setActivePolling(parsed.pollingRate);
      }
      triggerEdgeFlash();
      sound.ack();
      showToast(stageDpi
        ? `DPI changed to ${stageDpi.toLocaleString('en-US')} DPI`
        : `DPI changed to stage ${parsed.stage}`);
    }
  };

  // Profile parser for report 0xAA 0x0E
  const handleApplyProfile = (bytes) => {
    const parsed = parseProfileReport(bytes);
    rawBaseProfileBytesRef.current = bytes;

    setStages(parsed.stages);
    setActiveStage(parsed.activeStage);
    setActiveDpi(parsed.stages[parsed.activeStage - 1] || 1200);
    setActivePolling(parsed.pollingRate);

    setHardwareProfile({
      pollingRate: parsed.pollingRate,
      activeStage: parsed.activeStage,
      stages: parsed.stages,
    });
  };

  // Disconnect WebHID
  const disconnectDevice = async () => {
    const currentDev = deviceRef.current;
    if (currentDev && currentDev.opened) {
      try {
        await currentDev.close();
      } catch (err) {
        console.warn('[Phantom WebHID] Disconnect error:', err);
      }
    }
    setDevice(null);
    setConnected(false);
    const alternativeBatteryLink = (batterySourceRef.current === 'bluetooth' && bluetoothConnected)
      || (batterySourceRef.current === 'wired' && wiredConnected);
    if (!alternativeBatteryLink) {
      batteryValueRef.current = null;
      batterySourceRef.current = null;
      setBattery(null);
      pendingBatterySampleRef.current = null;
      setChargeStatus('UNKNOWN');
      setBatteryTelemetryStatus('unavailable');
      lastBatteryTimestampRef.current = null;
    }
    sound.toggle();
    showToast('Hardware receiver disconnected.');
  };

  // Wired mode is allow-listed separately. A documented read-only profile
  // query must validate before its matching control operations are enabled.
  const disconnectWiredDevice = async () => {
    const wiredDev = wiredDeviceRef.current;
    if (wiredDev) {
      if (wiredInputListenerRef.current) {
        wiredDev.removeEventListener('inputreport', wiredInputListenerRef.current);
      }
      if (wiredDev.opened) {
        try {
          await wiredDev.close();
        } catch (err) {
          console.warn('[Phantom WebHID] Wired disconnect error:', err);
        }
      }
    }
    wiredDeviceRef.current = null;
    wiredInputListenerRef.current = null;
    setWiredConnected(false);
    setWiredControlReady(false);
    if (batterySourceRef.current === 'wired') {
      batteryValueRef.current = null;
      batterySourceRef.current = null;
      pendingBatterySampleRef.current = null;
      setBattery(null);
      setChargeStatus('UNKNOWN');
      setBatteryTelemetryStatus('unavailable');
      lastBatteryTimestampRef.current = null;
    }
    showToast('Wired telemetry disconnected.');
  };

  const attachWiredDevice = async (wiredDev) => {
    if (!isWiredDevice(wiredDev)) return;
    try {
      if (!wiredDev.opened) await wiredDev.open();
      if (wiredInputListenerRef.current) {
        wiredDev.removeEventListener('inputreport', wiredInputListenerRef.current);
      }
      const listener = (event) => handleInputReport(event, 'wired');
      wiredInputListenerRef.current = listener;
      wiredDeviceRef.current = wiredDev;
      wiredDev.addEventListener('inputreport', listener);
      setWiredConnected(true);
      setWiredControlReady(false);
      batteryValueRef.current = null;
      batterySourceRef.current = null;
      pendingBatterySampleRef.current = null;
      setBattery(null);
      setChargeStatus('UNKNOWN');
      setBatteryTelemetryStatus('waiting');
      if (currentView !== 'studio') transitionToStudio();
      try {
        // 0x0E is a documented read-only query. Validate the returned profile
        // before enabling the corresponding verified read/write controls.
        const profileBytes = await queryDevice(wiredDev, 0x0E, 1400);
        const profile = parseProfileReport(profileBytes);
        validateProfile(profile);
        handleApplyProfile(profileBytes);
        setWiredControlReady(true);
        showToast('Wired profile read confirmed. Hardware controls enabled.');
      } catch (error) {
        console.warn('[Phantom WebHID] Wired profile read check failed:', error);
        showToast('Wired link connected, but its profile did not pass the safe read check; hardware controls stay disabled.');
      }
    } catch (error) {
      console.error('[Phantom WebHID] Wired attach error:', error);
      showToast(`Wired connection error: ${error.message || 'Could not open the vendor collection.'}`);
    }
  };

  const disconnectBluetoothHid = async () => {
    const hidDevice = bluetoothHidDeviceRef.current;
    if (hidDevice) {
      if (bluetoothHidInputListenerRef.current) {
        hidDevice.removeEventListener('inputreport', bluetoothHidInputListenerRef.current);
      }
      if (hidDevice.opened) {
        try {
          await hidDevice.close();
        } catch (error) {
          console.warn('[Phantom WebHID] Bluetooth HID disconnect error:', error);
        }
      }
    }
    bluetoothHidDeviceRef.current = null;
    bluetoothHidInputListenerRef.current = null;
    setBluetoothHidConnected(false);
    setBluetoothHidControlReady(false);
    if (batterySourceRef.current === 'bluetoothHid') {
      batteryValueRef.current = null;
      batterySourceRef.current = null;
      pendingBatterySampleRef.current = null;
      setBattery(null);
      setChargeStatus('UNKNOWN');
      setBatteryTelemetryStatus('unavailable');
      lastBatteryTimestampRef.current = null;
    }
    showToast('Bluetooth HID control disconnected.');
  };

  const attachBluetoothHidDevice = async (hidDevice) => {
    if (!isBluetoothHidDevice(hidDevice)) return;
    try {
      if (!hidDevice.opened) await hidDevice.open();
      if (bluetoothHidInputListenerRef.current) {
        hidDevice.removeEventListener('inputreport', bluetoothHidInputListenerRef.current);
      }
      const listener = (event) => handleInputReport(event, 'bluetoothHid');
      bluetoothHidInputListenerRef.current = listener;
      bluetoothHidDeviceRef.current = hidDevice;
      hidDevice.addEventListener('inputreport', listener);
      setBluetoothHidConnected(true);
      setBluetoothHidControlReady(false);
      if (currentView !== 'studio') transitionToStudio();

      try {
        // Only enable control after the known read-only profile response validates.
        const profileBytes = await queryDevice(hidDevice, 0x0E, 1400);
        const profile = parseProfileReport(profileBytes);
        validateProfile(profile);
        handleApplyProfile(profileBytes);
        setBluetoothHidControlReady(true);
        showToast('Bluetooth HID profile read confirmed. Hardware controls enabled.');
      } catch (error) {
        console.warn('[Phantom WebHID] Bluetooth HID profile read check failed:', error);
        showToast('Bluetooth HID is connected, but its profile did not pass the safe read check; controls stay disabled.');
      }
    } catch (error) {
      console.error('[Phantom WebHID] Bluetooth HID attach error:', error);
      showToast(`Bluetooth HID error: ${error.message || 'Could not open its vendor-control collection.'}`);
    }
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
      showToast('Receiver connected. Waiting for battery data.');
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

      try {
        dev.removeEventListener('inputreport', handleInputReport);
        dev.removeEventListener('disconnect', disconnectDevice);
      } catch {}

      dev.addEventListener('inputreport', handleInputReport);
      dev.addEventListener('disconnect', disconnectDevice);

      setDevice(dev);
      setConnected(true);
      batteryValueRef.current = null;
      batterySourceRef.current = null;
      setBattery(null);
      setChargeStatus('UNKNOWN');
      pendingBatterySampleRef.current = null;
      setBatteryTelemetryStatus('waiting');

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

    navigator.hid
      .getDevices()
      .then((devices) => {
        const vendorDev = findVendorDevice(devices);
        const wiredDev = devices.find(isWiredDevice);
        const bluetoothHidDev = devices.find(isBluetoothHidDevice);
        if (vendorDev) {
          attachDevice(vendorDev, true);
        } else if (wiredDev) {
          attachWiredDevice(wiredDev);
        } else if (bluetoothHidDev) {
          attachBluetoothHidDevice(bluetoothHidDev);
        }
      })
      .catch((err) => {
        console.warn('[Phantom WebHID] getDevices error:', err);
      });

    const onConnect = (event) => {
      if (isVendorDevice(event.device)) {
        attachDevice(event.device, true);
      } else if (isWiredDevice(event.device)) {
        attachWiredDevice(event.device);
      } else if (isBluetoothHidDevice(event.device)) {
        attachBluetoothHidDevice(event.device);
      }
    };

    const onDisconnect = (event) => {
      if (deviceRef.current && event.device === deviceRef.current) {
        disconnectDevice();
      } else if (wiredDeviceRef.current && event.device === wiredDeviceRef.current) {
        disconnectWiredDevice();
      } else if (bluetoothHidDeviceRef.current && event.device === bluetoothHidDeviceRef.current) {
        disconnectBluetoothHid();
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
      showToast(`WebHID requires a secure context. Current page: ${window.location.origin}. Use http://localhost:5173/ or HTTPS.`);
      return;
    }
    if (!navigator.hid) {
      showToast('WebHID is not supported by this browser. Please open in Chrome or Edge.');
      return;
    }

    try {
      const devices = await navigator.hid.requestDevice({ filters: FILTER });
      if (!devices || devices.length === 0) return;

      const selectedDev = findVendorDevice(devices);
      if (!selectedDev) {
        showToast('Selected device is not the YJX receiver collection (A8A5:2255, FF01:0010).');
        return;
      }
      await attachDevice(selectedDev, false);
    } catch (error) {
      if (error.name === 'NotFoundError') {
        showToast('Device selection window cancelled.');
        return;
      }
      console.error('[Phantom WebHID] requestDevice error:', error);
      showToast(`${error.name || 'Connection error'}: ${error.message || 'Could not connect.'}`);
    }
  };

  const connectWiredDevice = async () => {
    if (!window.isSecureContext || !navigator.hid) {
      showToast('Wired HID access requires Chrome or Edge on a secure page.');
      return;
    }
    try {
      const devices = await navigator.hid.requestDevice({ filters: WIRED_FILTER });
      const wiredDev = devices.find(isWiredDevice);
      if (!wiredDev) return;
      await attachWiredDevice(wiredDev);
    } catch (error) {
      if (error.name === 'NotFoundError') {
        showToast('Wired device picker cancelled.');
        return;
      }
      console.error('[Phantom WebHID] Wired requestDevice error:', error);
      showToast(`${error.name || 'Connection error'}: ${error.message || 'Could not connect over wired HID.'}`);
    }
  };

  const connectBluetoothHid = async () => {
    if (!window.isSecureContext || !navigator.hid) {
      showToast('Bluetooth HID access requires Chrome or Edge on a secure page.');
      return;
    }
    try {
      const devices = await navigator.hid.requestDevice({ filters: BLUETOOTH_HID_FILTER });
      const selected = devices[0];
      if (!selected) return;
      if (!isBluetoothHidDevice(selected)) {
        const usages = (selected.collections || [])
          .map((collection) => `${collection.usagePage?.toString(16) || '????'}:${collection.usage?.toString(16) || '????'}`)
          .join(', ');
        showToast(`Bluetooth HID lacks the required vendor-control collection FF01:0010 (found ${usages || 'none'}).`);
        return;
      }
      await attachBluetoothHidDevice(selected);
    } catch (error) {
      if (error.name === 'NotFoundError') {
        showToast('Bluetooth HID picker cancelled.');
        return;
      }
      console.error('[Phantom WebHID] Bluetooth HID request error:', error);
      showToast(`${error.name || 'Connection error'}: ${error.message || 'Could not connect to Bluetooth HID.'}`);
    }
  };

  // Optional BLE battery telemetry. Only uses the standard, read-only Battery Service.
  const disconnectBluetoothBattery = () => {
    const characteristic = batteryCharacteristicRef.current;
    if (characteristic && bluetoothBatteryListenerRef.current) {
      characteristic.removeEventListener('characteristicvaluechanged', bluetoothBatteryListenerRef.current);
    }
    const bleDevice = bluetoothDeviceRef.current;
    if (bleDevice && bluetoothDisconnectListenerRef.current) {
      bleDevice.removeEventListener('gattserverdisconnected', bluetoothDisconnectListenerRef.current);
    }
    if (bleDevice?.gatt?.connected) bleDevice.gatt.disconnect();
    bluetoothDeviceRef.current = null;
    bluetoothDisconnectListenerRef.current = null;
    batteryCharacteristicRef.current = null;
    bluetoothBatteryListenerRef.current = null;
    setBluetoothConnected(false);
    if (batterySourceRef.current === 'bluetooth' && !deviceRef.current) {
      batteryValueRef.current = null;
      batterySourceRef.current = null;
      pendingBatterySampleRef.current = null;
      setBattery(null);
      setChargeStatus('UNKNOWN');
      setBatteryTelemetryStatus('unavailable');
      lastBatteryTimestampRef.current = null;
    }
  };

  const connectBluetoothBattery = async () => {
    if (!window.isSecureContext || !navigator.bluetooth) {
      showToast('Bluetooth battery access requires Chrome or Edge on a secure page.');
      return;
    }

    let requestedDevice = null;
    try {
      const bleDevice = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'ACM X12' }],
        optionalServices: ['battery_service'],
      });
      requestedDevice = bleDevice;
      if (!bleDevice.gatt) throw new Error('This Bluetooth device does not expose a GATT server.');

      setBatteryTelemetryStatus('waiting');
      const server = await bleDevice.gatt.connect();
      const service = await server.getPrimaryService('battery_service');
      const characteristic = await service.getCharacteristic('battery_level');
      const onBatteryValue = (event) => {
        const level = event.target.value.getUint8(0);
        if (level <= 100) handleBatteryUpdate(level, null, 'bluetooth');
      };

      const onDisconnected = () => {
        if (bluetoothDeviceRef.current !== bleDevice) return;
        bluetoothDeviceRef.current = null;
        bluetoothDisconnectListenerRef.current = null;
        batteryCharacteristicRef.current = null;
        bluetoothBatteryListenerRef.current = null;
        setBluetoothConnected(false);
        if (batterySourceRef.current === 'bluetooth' && !deviceRef.current) {
          batteryValueRef.current = null;
          batterySourceRef.current = null;
          pendingBatterySampleRef.current = null;
          setBattery(null);
          setChargeStatus('UNKNOWN');
          setBatteryTelemetryStatus('unavailable');
          lastBatteryTimestampRef.current = null;
        }
      };
      bleDevice.addEventListener('gattserverdisconnected', onDisconnected);
      bluetoothDisconnectListenerRef.current = onDisconnected;
      characteristic.addEventListener('characteristicvaluechanged', onBatteryValue);
      try {
        await characteristic.startNotifications();
      } catch (notificationError) {
        console.info('[Phantom Studio] Battery notifications unavailable; using the initial read only.', notificationError);
      }
      const initialValue = await characteristic.readValue();
      const initialLevel = initialValue.getUint8(0);
      if (initialLevel > 100) throw new Error(`Invalid BLE battery level: ${initialLevel}%.`);

      bluetoothDeviceRef.current = bleDevice;
      batteryCharacteristicRef.current = characteristic;
      bluetoothBatteryListenerRef.current = onBatteryValue;
      setBluetoothConnected(true);
      batteryValueRef.current = null;
      batterySourceRef.current = null;
      pendingBatterySampleRef.current = null;
      setBattery(null);
      handleBatteryUpdate(initialLevel, null, 'bluetooth');
      if (currentView !== 'studio') transitionToStudio();
      showToast('Bluetooth battery connected.');
    } catch (error) {
      if (requestedDevice && bluetoothDisconnectListenerRef.current) {
        requestedDevice.removeEventListener('gattserverdisconnected', bluetoothDisconnectListenerRef.current);
        bluetoothDisconnectListenerRef.current = null;
      }
      if (requestedDevice?.gatt?.connected && bluetoothDeviceRef.current !== requestedDevice) {
        requestedDevice.gatt.disconnect();
      }
      setBatteryTelemetryStatus(connected ? 'live' : 'unavailable');
      showToast(error.name === 'NotFoundError'
        ? 'Bluetooth device picker cancelled.'
        : `Bluetooth battery unavailable: ${error.message || 'Battery Service not found.'}`);
    }
  };

  const getControlConnection = () => {
    if (device) return { device, mode: 'receiver' };
    if (wiredConnected && wiredControlReady && wiredDeviceRef.current) {
      return { device: wiredDeviceRef.current, mode: 'wired' };
    }
    if (bluetoothHidConnected && bluetoothHidControlReady && bluetoothHidDeviceRef.current) {
      return { device: bluetoothHidDeviceRef.current, mode: 'bluetooth' };
    }
    return null;
  };

  // Apply lighting effect (Command 0x21)
  const applyEffectToHardware = async (effectId = selectedEffect) => {
    const connection = getControlConnection();
    if (!connection) {
      showToast('Connect the receiver, wired HID, or Bluetooth HID link and pass its profile read check.');
      return;
    }
    const eff = EFFECTS.find((e) => e.id === effectId);
    if (!eff) return;

    try {
      setIsApplyingLighting(true);
      if (!connection.device.opened) {
        await connection.device.open();
      }
      const ack = waitForCommand(connection.device, 0x21, 1500);
      const pending = connection.mode === 'wired'
        ? ack
        : ack.catch((err) => {
            console.warn('[Phantom WebHID] Lighting command 0x21 ack timed out, proceeding:', err);
          });
      await connection.device.sendReport(0, buildLightingPacket(eff.id));
      await pending;

      triggerEdgeFlash();
      sound.ack();
      showToast(`Applied ${eff.name} lighting mode.`);
    } catch (error) {
      console.error('[Phantom WebHID] applyEffectToHardware error:', error);
      showToast(`Write error: ${error.message}`);
    } finally {
      setIsApplyingLighting(false);
    }
  };

  // Apply complete DPI profile to hardware (Command 0x0F with fresh read & read-back verification)
  const applyProfileToHardware = async (candidateProfile = null) => {
    const connection = getControlConnection();
    if (!connection) {
      showToast('Connect the receiver, wired HID, or Bluetooth HID link and pass its profile read check.');
      return;
    }

    const target = candidateProfile || {
      pollingRate: activePolling,
      activeStage,
      stages,
    };

    try {
      setIsApplyingProfile(true);
      validateProfile(target);

      const verified = await writeProfileToHardware(connection.device, target);
      setStages(verified.stages);
      setActiveStage(verified.activeStage);
      setActiveDpi(verified.stages[verified.activeStage - 1]);
      setActivePolling(verified.pollingRate);
      setHardwareProfile({
        pollingRate: verified.pollingRate,
        activeStage: verified.activeStage,
        stages: verified.stages,
      });

      triggerEdgeFlash();
      sound.ack();
      showToast(`Mouse settings updated: Stage ${verified.activeStage}, ${verified.stages[verified.activeStage - 1]} DPI, ${verified.pollingRate} Hz`);
    } catch (error) {
      console.error('[Phantom WebHID] applyProfileToHardware error:', error);
      sound.toggle();
      showToast(`Profile write error: ${error.message}`);
    } finally {
      setIsApplyingProfile(false);
    }
  };

  // Restore known-good baseline (safe restore without OEM factory-reset write)
  const restoreKnownGoodBaseline = async () => {
    sound.click();
    const baseline = { ...DEFAULT_PROFILE };
    setStages(baseline.stages);
    setActiveStage(baseline.activeStage);
    setActiveDpi(baseline.stages[baseline.activeStage - 1]);
    setActivePolling(baseline.pollingRate);
    setSelectedEffect(baseline.selectedEffect);

    const eff = EFFECTS.find((e) => e.id === baseline.selectedEffect);
    if (eff) setActiveColor(eff.hex);

    if (getControlConnection()?.device.opened) {
      await applyProfileToHardware(baseline);
      await applyEffectToHardware(baseline.selectedEffect);
      showToast('Default settings restored on the mouse.');
    } else {
      showToast('Default settings restored in this browser. Connect the mouse to apply them.');
    }
  };

  // Profile management helpers
  const handleSaveProfile = (name) => {
    if (!name || !name.trim()) {
      showToast('Profile name cannot be empty.');
      return;
    }
    const newProfile = {
      id: `prof-${Date.now()}`,
      name: name.trim(),
      timestamp: new Date().toISOString(),
      pollingRate: activePolling,
      activeStage,
      stages,
      selectedEffect,
      activeColor,
    };
    const updated = [...profiles.filter((p) => p.name !== name.trim()), newProfile];
    setProfiles(updated);
    setActiveProfileId(newProfile.id);
    try {
      localStorage.setItem('phantom-profiles', JSON.stringify(updated));
    } catch {}
    sound.ack();
    showToast(`Profile "${newProfile.name}" saved locally.`);
  };

  const handleLoadProfile = (prof) => {
    sound.click();
    setActiveProfileId(prof.id);
    if (prof.stages) setStages(prof.stages);
    if (prof.activeStage) {
      setActiveStage(prof.activeStage);
      if (prof.stages) setActiveDpi(prof.stages[prof.activeStage - 1]);
    }
    if (prof.pollingRate) setActivePolling(prof.pollingRate);
    if (prof.selectedEffect !== undefined) setSelectedEffect(prof.selectedEffect);
    if (prof.activeColor) setActiveColor(prof.activeColor);
    showToast(`Loaded profile "${prof.name}". Click Apply to transmit to hardware.`);
  };

  const handleDeleteProfile = (profId) => {
    sound.click();
    if (profiles.length <= 1) {
      showToast('Cannot delete the last remaining profile.');
      return;
    }
    const updated = profiles.filter((p) => p.id !== profId);
    setProfiles(updated);
    if (activeProfileId === profId) {
      setActiveProfileId(updated[0].id);
      handleLoadProfile(updated[0]);
    }
    try {
      localStorage.setItem('phantom-profiles', JSON.stringify(updated));
    } catch {}
    showToast('Profile deleted.');
  };

  const handleExportProfile = (prof) => {
    sound.click();
    const payload = {
      version: 1,
      type: 'phantom-x12-profile',
      exportedAt: new Date().toISOString(),
      profile: prof,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phantom-x12-${prof.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported "${prof.name}" JSON file.`);
  };

  const handleImportProfile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const imported = data.profile || data;
        validateProfile(imported);
        const prof = {
          id: `prof-${Date.now()}`,
          name: imported.name || 'Imported Profile',
          pollingRate: imported.pollingRate || 1000,
          activeStage: imported.activeStage || 1,
          stages: imported.stages,
          selectedEffect: imported.selectedEffect ?? 0,
          activeColor: imported.activeColor || '#A3FF12',
        };
        const updated = [...profiles, prof];
        setProfiles(updated);
        handleLoadProfile(prof);
        try {
          localStorage.setItem('phantom-profiles', JSON.stringify(updated));
        } catch {}
        showToast(`Imported profile "${prof.name}".`);
      } catch (err) {
        showToast(`Import error: ${err.message}`);
      }
    };
    reader.readAsText(file);
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
    if (['overview', 'lighting', 'performance', 'profiles', 'about'].includes(hash)) {
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
          batteryTelemetryStatus={batteryTelemetryStatus}
          activeEffect={selectedEffect}
          activeColor={activeColor}
        />
      ) : (
        /* VIEW 2: PHANTOM DEVICE STUDIO COCKPIT */
        <StudioCockpit
          connected={connected}
          controlConnected={connected || (wiredConnected && wiredControlReady) || (bluetoothHidConnected && bluetoothHidControlReady)}
          controlMode={connected ? 'receiver' : wiredConnected && wiredControlReady ? 'wired' : bluetoothHidConnected && bluetoothHidControlReady ? 'bluetooth' : 'none'}
          onConnectToggle={connected ? disconnectDevice : connectDevice}
          wiredConnected={wiredConnected}
          onConnectWired={connectWiredDevice}
          onDisconnectWired={disconnectWiredDevice}
          bluetoothConnected={bluetoothConnected}
          onConnectBluetooth={connectBluetoothBattery}
          onDisconnectBluetooth={disconnectBluetoothBattery}
          bluetoothHidConnected={bluetoothHidConnected}
          onConnectBluetoothHid={connectBluetoothHid}
          onDisconnectBluetoothHid={disconnectBluetoothHid}
          onReturnToLanding={transitionToLanding}
          battery={battery}
          chargeStatus={chargeStatus}
          batteryTelemetryStatus={batteryTelemetryStatus}
          // Performance State & Actions
          activeStage={activeStage}
          activeDpi={activeDpi}
          activePolling={activePolling}
          stages={stages}
          hardwareProfile={hardwareProfile}
          isApplyingProfile={isApplyingProfile}
          onChangeActiveStage={(stageNum) => {
            setActiveStage(stageNum);
            setActiveDpi(stages[stageNum - 1]);
          }}
          onChangeStageDpi={(stageIdx, newDpi) => {
            const nextStages = [...stages];
            nextStages[stageIdx] = newDpi;
            setStages(nextStages);
            if (stageIdx + 1 === activeStage) {
              setActiveDpi(newDpi);
            }
          }}
          onSetAllStages={(dpiValue) => {
            const nextStages = [dpiValue, dpiValue, dpiValue, dpiValue, dpiValue, dpiValue];
            setStages(nextStages);
            setActiveDpi(dpiValue);
            showToast(`All 6 stages set to ${dpiValue} DPI. Click Apply to write to hardware.`);
          }}
          onChangePollingRate={setActivePolling}
          onApplyProfileToHardware={() => applyProfileToHardware()}
          // Lighting State & Actions
          selectedEffect={selectedEffect}
          onSelectEffect={(effectId) => {
            setSelectedEffect(effectId);
            const eff = EFFECTS.find((e) => e.id === effectId);
            if (eff) setActiveColor(eff.hex);
          }}
          activeColor={activeColor}
          onApplyEffect={applyEffectToHardware}
          isApplyingLighting={isApplyingLighting}
          // Profiles & System Restore
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSaveProfile={handleSaveProfile}
          onLoadProfile={handleLoadProfile}
          onDeleteProfile={handleDeleteProfile}
          onExportProfile={handleExportProfile}
          onImportProfile={handleImportProfile}
          onRestoreKnownGoodBaseline={restoreKnownGoodBaseline}
          // Modals & Theme
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
      <div className={`hud-toast ${toastMessage ? 'show' : ''}`} role="status" aria-live="polite">
        {toastMessage}
      </div>
    </div>
  );
}
