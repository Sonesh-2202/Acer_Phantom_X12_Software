/**
 * Acer Phantom X12 (VID: 0x248A / PID: 0x8266, YJX 0xA8A5:0x2255)
 * WebHID Protocol Handlers and Report Parsers.
 */

// Filter strictly for the vendor configuration collection (usagePage: 0xFF01).
// This prevents Windows from presenting or picking the OS-protected mouse pointer interface (usagePage: 0x0001),
// which causes DOMException: "Failed to write report".
export const FILTER = [
  { vendorId: 0xA8A5, productId: 0x2255, usagePage: 0xFF01, usage: 0x0010 },
];

export const POLLING = { 1: 125, 2: 250, 3: 500, 4: 1000 };

export const EFFECTS = [
  { id: 6, name: '00 Void', pattern: 'Lights off · stealth battery saver', hex: '#111111', cmd: 6 },
  { id: 0, name: '01 Aurora', pattern: 'Wave · flowing 360° spectrum', hex: '#45E8FF', cmd: 0 },
  { id: 1, name: '02 Neon Bloom', pattern: 'Neon · bright dynamic color cycle', hex: '#FF16A6', cmd: 1 },
  { id: 2, name: '03 Comet Rally', pattern: 'Touring flash · moving light bursts', hex: '#A3FF12', cmd: 2 },
  { id: 3, name: '04 Orbit Bounce', pattern: 'YOLO ball · ping-pong bouncing light', hex: '#FFB800', cmd: 3 },
  { id: 4, name: '05 Photon Sweep', pattern: 'Unidirectional laser flash sweep', hex: '#45E8FF', cmd: 4 },
  { id: 5, name: '06 Lumen Breath', pattern: 'Circulatory respiration · slow warm pulse', hex: '#A3FF12', cmd: 5 },
];

/**
 * Checks if an HIDDevice is the vendor management collection (usagePage: 0xFF01).
 */
export function isVendorDevice(device) {
  if (!device) return false;
  if (device.vendorId !== 0xA8A5 || device.productId !== 0x2255) return false;
  return device.collections?.some((c) => c.usagePage === 0xFF01 && c.usage === 0x0010) ?? false;
}

/**
 * Finds the vendor control collection among a list of devices.
 */
export function findVendorDevice(devices) {
  if (!devices || devices.length === 0) return null;
  return devices.find(isVendorDevice) ?? null;
}

export function buildQuery(command) {
  const report = new Uint8Array(64);
  report[0] = 0x55;
  report[1] = command;
  return report;
}

export function buildLightingPacket(modeId) {
  const packet = new Uint8Array(64);
  packet.set([0x55, 0x21, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, modeId]);
  return packet;
}

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
      reject(new Error(`Timeout: No reply from receiver for command 0x${command.toString(16).padStart(2, '0')}.`));
    }, timeout);

    device.addEventListener('inputreport', listener);
  });
}

export async function queryDevice(device, command, timeout = 1500) {
  const pending = waitForCommand(device, command, timeout);
  await device.sendReport(0, buildQuery(command));
  return pending;
}
