/**
 * Acer Phantom X12 2.4 GHz receiver (VID: 0xA8A5 / PID: 0x2255)
 * WebHID Protocol Handlers, Report Parsers, and Profile Validators.
 */

// Filter strictly for the vendor configuration collection (usagePage: 0xFF01, usage: 0x0010).
// Windows blocks writes to the OS-protected mouse pointer interface (usagePage: 0x0001).
export const FILTER = [
  { vendorId: 0xA8A5, productId: 0x2255, usagePage: 0xFF01, usage: 0x0010 },
];

// Windows reports the directly wired mouse as a separate device ID. Its
// vendor-control collection was observed as FF01:0010; keep this allow-list
// separate from the confirmed 2.4 GHz receiver filter above.
export const WIRED_FILTER = [
  { vendorId: 0xA8A4, productId: 0x2255, usagePage: 0xFF01, usage: 0x0010 },
];

// The paired ACM X12 BLE HID node advertises this HID VID/PID on Windows.
// We still require its vendor-control collection before opening it.
export const BLUETOOTH_HID_FILTER = [
  { vendorId: 0x2717, productId: 0x32B0 },
];

export const POLLING = { 1: 125, 2: 250, 3: 500, 4: 1000 };
export const POLLING_TO_LEVEL = { 125: 1, 250: 2, 500: 3, 1000: 4 };

export const DPI_MIN = 200;
export const DPI_MAX = 12000;
export const DPI_STEP = 100;

export const EFFECTS = [
  { id: 6, name: '00 Void', pattern: 'Lights off · stealth battery saver', hex: '#111111', cmd: 6 },
  { id: 0, name: '01 Aurora', pattern: 'Wave · flowing 360° spectrum', hex: '#45E8FF', cmd: 0 },
  { id: 1, name: '02 Neon Bloom', pattern: 'Neon · bright dynamic color cycle', hex: '#FF16A6', cmd: 1 },
  { id: 2, name: '03 Comet Rally', pattern: 'Touring flash · moving light bursts', hex: '#A3FF12', cmd: 2 },
  { id: 3, name: '04 Orbit Bounce', pattern: 'YOLO ball · ping-pong bouncing light', hex: '#FFB800', cmd: 3 },
  { id: 4, name: '05 Photon Sweep', pattern: 'Unidirectional laser flash sweep', hex: '#45E8FF', cmd: 4 },
  { id: 5, name: '06 Lumen Breath', pattern: 'Circulatory respiration · slow warm pulse', hex: '#A3FF12', cmd: 5 },
];

export const DEFAULT_PROFILE = {
  pollingRate: 1000,
  activeStage: 1,
  stages: [1200, 2400, 3200, 4800, 6400, 12000],
  selectedEffect: 0,
};

export const DEFAULT_BUTTON_MAPPINGS = [
  { id: 'M1', name: 'Left Click', defaultAction: 'left_click', label: 'Primary Click', code: [0x20, 0x01, 0x00, 0x00] },
  { id: 'M2', name: 'Right Click', defaultAction: 'right_click', label: 'Secondary Click', code: [0x20, 0x02, 0x00, 0x00] },
  { id: 'M3', name: 'Scroll Wheel Click', defaultAction: 'middle_click', label: 'Middle Click', code: [0x20, 0x04, 0x00, 0x00] },
  { id: 'M4', name: 'Backward Side', defaultAction: 'back', label: 'Browser Back', code: [0x20, 0x08, 0x00, 0x00] },
  { id: 'M5', name: 'Forward Side', defaultAction: 'forward', label: 'Browser Forward', code: [0x20, 0x10, 0x00, 0x00] },
  { id: 'M6', name: 'DPI Cycle', defaultAction: 'dpi_cycle', label: 'DPI Loop Toggle', code: [0xF0, 0x01, 0x01, 0x00] },
  { id: 'ScrollUp', name: 'Scroll Wheel Up', defaultAction: 'scroll_up', label: 'Wheel Scroll Up', code: [0x21, 0x38, 0x01, 0x00] },
  { id: 'ScrollDown', name: 'Scroll Wheel Down', defaultAction: 'scroll_down', label: 'Wheel Scroll Down', code: [0x21, 0x38, 0xFF, 0x00] },
];

export const BUTTON_ACTIONS = [
  { id: 'left_click', label: 'Left Click (Primary)' },
  { id: 'right_click', label: 'Right Click (Secondary)' },
  { id: 'middle_click', label: 'Middle Click' },
  { id: 'back', label: 'Browser Back' },
  { id: 'forward', label: 'Browser Forward' },
  { id: 'dpi_cycle', label: 'DPI Loop Toggle' },
  { id: 'double_click', label: 'Double Click' },
  { id: 'mute', label: 'Media: Mute' },
  { id: 'volume_up', label: 'Media: Volume Up' },
  { id: 'volume_down', label: 'Media: Volume Down' },
  { id: 'play_pause', label: 'Media: Play / Pause' },
];

/**
 * Checks if an HIDDevice is the vendor management collection (usagePage: 0xFF01, usage: 0x0010).
 */
export function isVendorDevice(device) {
  if (!device) return false;
  if (device.vendorId !== 0xA8A5 || device.productId !== 0x2255) return false;
  return device.collections?.some((c) => c.usagePage === 0xFF01 && c.usage === 0x0010) ?? false;
}

/** Checks only the observed wired mouse vendor-control collection. */
export function isWiredDevice(device) {
  if (!device) return false;
  if (device.vendorId !== 0xA8A4 || device.productId !== 0x2255) return false;
  return device.collections?.some((c) => c.usagePage === 0xFF01 && c.usage === 0x0010) ?? false;
}

/** Checks the observed ACM X12 BLE HID identity and its vendor-control collection. */
export function isBluetoothHidDevice(device) {
  if (!device || device.vendorId !== 0x2717 || device.productId !== 0x32B0) return false;
  return device.collections?.some((c) => c.usagePage === 0xFF01 && c.usage === 0x0010) ?? false;
}

/**
 * Finds the vendor control collection among a list of devices.
 */
export function findVendorDevice(devices) {
  if (!devices || devices.length === 0) return null;
  return devices.find(isVendorDevice) ?? null;
}

/**
 * Validates a single DPI value within allowed hardware bounds.
 */
export function clampDpi(value) {
  const num = Math.round(Number(value) || DPI_MIN);
  return Math.min(DPI_MAX, Math.max(DPI_MIN, num));
}

/**
 * Validates a complete hardware profile.
 */
export function validateProfile(profile) {
  if (!profile) throw new Error('Profile cannot be empty.');
  if (!Array.isArray(profile.stages) || profile.stages.length !== 6) {
    throw new Error('A valid profile must contain exactly 6 DPI stages.');
  }
  for (let i = 0; i < 6; i++) {
    const dpi = profile.stages[i];
    if (!Number.isFinite(dpi) || dpi < DPI_MIN || dpi > DPI_MAX) {
      throw new Error(`Stage ${i + 1} DPI value (${dpi}) is outside valid range [${DPI_MIN}, ${DPI_MAX}].`);
    }
  }
  if (!Number.isInteger(profile.activeStage) || profile.activeStage < 1 || profile.activeStage > 6) {
    throw new Error(`Active stage must be an integer between 1 and 6 (got ${profile.activeStage}).`);
  }
  if (!POLLING_TO_LEVEL[profile.pollingRate]) {
    throw new Error(`Polling rate must be 125, 250, 500, or 1000 Hz (got ${profile.pollingRate}).`);
  }
  return true;
}

/**
 * Validates a macro structure.
 */
export function validateMacro(macro) {
  if (!macro || typeof macro !== 'object') throw new Error('Macro must be an object.');
  if (!macro.name || !macro.name.trim()) throw new Error('Macro name cannot be empty.');
  const loop = Number(macro.loopCount ?? 1);
  if (!Number.isInteger(loop) || loop < 1 || loop > 100) {
    throw new Error('Macro loop count must be an integer between 1 and 100.');
  }
  if (!Array.isArray(macro.events)) throw new Error('Macro events must be an array.');
  for (let i = 0; i < macro.events.length; i++) {
    const ev = macro.events[i];
    if (!['key', 'mouse'].includes(ev.kind)) {
      throw new Error(`Event #${i + 1} has invalid kind "${ev.kind}". Expected "key" or "mouse".`);
    }
    if (!ev.action || typeof ev.action !== 'string') {
      throw new Error(`Event #${i + 1} action cannot be empty.`);
    }
    const delay = Number(ev.delay_ms ?? 0);
    if (!Number.isFinite(delay) || delay < 0 || delay > 60000) {
      throw new Error(`Event #${i + 1} delay (${delay} ms) must be between 0 and 60,000 ms.`);
    }
  }
  return true;
}

/**
 * Builds a 64-byte query report (starts with 0x55, command at byte 1).
 */
export function buildQuery(command) {
  const report = new Uint8Array(64);
  report[0] = 0x55;
  report[1] = command;
  return report;
}

/**
 * Builds a 64-byte lighting effect packet for command 0x21.
 */
export function buildLightingPacket(modeId) {
  const packet = new Uint8Array(64);
  packet.set([0x55, 0x21, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, modeId]);
  return packet;
}

/**
 * Builds a 64-byte profile write packet (0x0F) according to captured hardware traffic.
 * When rawBaseBytes (from a fresh 0x0E query) is provided, offsets 25..63 are preserved
 * exactly as received from hardware without synthesizing unknown fields.
 */
export function buildProfileWritePacket(desiredProfile, rawBaseBytes = null) {
  validateProfile(desiredProfile);

  const packet = new Uint8Array(64);
  // Confirmed 10-byte header for command 0x0F
  packet.set([0x55, 0x0F, 0xAE, 0x0A, 0x2F, 0x01, 0x01, 0x00, 0x00, 0x00]);

  packet[10] = POLLING_TO_LEVEL[desiredProfile.pollingRate];
  packet[11] = 0x06; // Stage count
  packet[12] = desiredProfile.activeStage;

  // 6 little-endian uint16 DPI values
  for (let i = 0; i < 6; i++) {
    const val = desiredProfile.stages[i];
    packet[13 + i * 2] = val & 0xFF;
    packet[14 + i * 2] = (val >> 8) & 0xFF;
  }

  if (rawBaseBytes && (rawBaseBytes.length === 64 || rawBaseBytes.byteLength === 64)) {
    const baseSlice = rawBaseBytes instanceof Uint8Array
      ? rawBaseBytes.subarray(25, 64)
      : new Uint8Array(rawBaseBytes.slice(25, 64));
    packet.set(baseSlice, 25);
  } else {
    // Default captured tail: 24 zeroes + FF 01 0A 01 FF 00 + 9 zeroes
    packet[49] = 0xFF;
    packet[50] = 0x01;
    packet[51] = 0x0A;
    packet[52] = 0x01; // Default 1-minute sleep timer observed in capture
    packet[53] = 0xFF;
    packet[54] = 0x00;
  }

  return packet;
}

/**
 * Parses an 0xAA 0x0E profile reply from the receiver.
 */
export function parseProfileReport(bytes) {
  if (!bytes || bytes.length < 25) {
    throw new Error('Profile report is truncated or invalid.');
  }
  if (bytes[0] !== 0xAA || bytes[1] !== 0x0E) {
    throw new Error('Unexpected marker or command in profile report.');
  }

  const pollingLevel = bytes[10];
  const pollingRate = POLLING[pollingLevel] || 1000;
  const stageCount = bytes[11];
  const activeStage = bytes[12];
  const stages = [];
  for (let offset = 13; offset < 25; offset += 2) {
    stages.push(bytes[offset] | (bytes[offset + 1] << 8));
  }

  return {
    pollingRate,
    pollingLevel,
    stageCount,
    activeStage,
    stages,
    rawBytes: Array.from(bytes),
  };
}

/**
 * Parses unsolicited streaming input reports (AA FA ...).
 */
export function parseInputReport(bytes) {
  if (!bytes || bytes.length < 2 || bytes[0] !== 0xAA) return null;

  if (bytes[1] === 0xFA) {
    // 0xD0: Battery report (bytes[8] === 0xD0)
    if (bytes.length > 10 && bytes[8] === 0xD0) {
      // Ignore malformed telemetry rather than treating a corrupt charge flag
      // as "on battery" and making the UI appear to jump between states.
      if (bytes[9] > 100 || (bytes[10] !== 0 && bytes[10] !== 1)) return null;
      return {
        type: 'battery',
        level: bytes[9],
        chargeFlag: bytes[10],
        charging: bytes[10] === 1,
      };
    }
    // 0xAE: Hardware DPI toggle or polling report (bytes[2] === 0xAE && bytes[8] === 0x10)
    if (bytes.length > 10 && bytes[2] === 0xAE && bytes[8] === 0x10) {
      return {
        type: 'dpi_toggle',
        stage: bytes[9],
        pollingLevel: bytes[10],
        pollingRate: POLLING[bytes[10]] || null,
      };
    }
  }

  if (bytes[1] === 0x0E) {
    return { type: 'profile_read', ...parseProfileReport(bytes) };
  }
  if (bytes[1] === 0x0F) {
    return { type: 'profile_write_ack', rawBytes: Array.from(bytes) };
  }
  if (bytes[1] === 0x21) {
    return { type: 'lighting_ack', rawBytes: Array.from(bytes) };
  }
  if (bytes[1] === 0x03) {
    return { type: 'model_firmware', rawBytes: Array.from(bytes) };
  }

  return { type: 'unknown', command: bytes[1], rawBytes: Array.from(bytes) };
}

/**
 * Listens for a specific command reply on a WebHID device.
 */
export function waitForCommand(device, command, timeout = 1500) {
  return new Promise((resolve, reject) => {
    let timer;
    const listener = (event) => {
      const data = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
      if (data[0] === 0xAA && data[1] === command) {
        clearTimeout(timer);
        device.removeEventListener('inputreport', listener);
        resolve(Array.from(data));
      }
    };
    timer = setTimeout(() => {
      device.removeEventListener('inputreport', listener);
      reject(new Error(`Timeout: No reply from receiver for command 0x${command.toString(16).padStart(2, '0').toUpperCase()}.`));
    }, timeout);

    device.addEventListener('inputreport', listener);
  });
}

/**
 * Sends a query and awaits the matching response.
 */
export async function queryDevice(device, command, timeout = 1500) {
  const pending = waitForCommand(device, command, timeout);
  await device.sendReport(0, buildQuery(command));
  return pending;
}

/**
 * Transmits a complete profile to hardware using the verified 0x0F format.
 * Automatically performs:
 * 1. Fresh 0x0E query to capture current hardware state and unknown tail bytes.
 * 2. 0x0F packet construction preserving tail bytes.
 * 3. Transmission and awaiting of 0x0F acknowledgement (AA 0F).
 * 4. Pacing delay (60 ms) and read-back verification (0x0E).
 * 5. State validation against requested settings.
 */
export async function writeProfileToHardware(device, desiredProfile) {
  if (!device || !device.opened) {
    throw new Error('Device is not connected or opened.');
  }

  validateProfile(desiredProfile);

  // 1. Fresh read
  const freshReadBytes = await queryDevice(device, 0x0E, 1500);
  if (!freshReadBytes || freshReadBytes[0] !== 0xAA || freshReadBytes[1] !== 0x0E) {
    throw new Error('Failed to read baseline profile from hardware before writing.');
  }

  // 2. Build 0x0F packet preserving baseline bytes
  const packet = buildProfileWritePacket(desiredProfile, freshReadBytes);

  // 3. Await 0x0F ack
  const pendingAck = waitForCommand(device, 0x0F, 1800);
  await device.sendReport(0, packet);
  await pendingAck;

  // 4. Inter-query pacing delay
  await new Promise((resolve) => setTimeout(resolve, 60));

  // 5. Read-back verification
  const readBackBytes = await queryDevice(device, 0x0E, 1500);
  const verifiedProfile = parseProfileReport(readBackBytes);

  if (verifiedProfile.activeStage !== desiredProfile.activeStage) {
    throw new Error(`Read-back verification mismatch on active stage (expected ${desiredProfile.activeStage}, got ${verifiedProfile.activeStage}).`);
  }
  if (verifiedProfile.pollingRate !== desiredProfile.pollingRate) {
    throw new Error(`Read-back verification mismatch on polling rate (expected ${desiredProfile.pollingRate}Hz, got ${verifiedProfile.pollingRate}Hz).`);
  }
  for (let i = 0; i < 6; i++) {
    if (verifiedProfile.stages[i] !== desiredProfile.stages[i]) {
      throw new Error(`Read-back verification mismatch on Stage ${i + 1} DPI (expected ${desiredProfile.stages[i]}, got ${verifiedProfile.stages[i]}).`);
    }
  }

  return verifiedProfile;
}
