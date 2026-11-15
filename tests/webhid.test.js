import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FILTER,
  POLLING,
  POLLING_TO_LEVEL,
  DPI_MIN,
  DPI_MAX,
  EFFECTS,
  DEFAULT_PROFILE,
  DEFAULT_BUTTON_MAPPINGS,
  isVendorDevice,
  findVendorDevice,
  clampDpi,
  validateProfile,
  validateMacro,
  buildQuery,
  buildLightingPacket,
  buildProfileWritePacket,
  parseProfileReport,
  parseInputReport,
} from '../src/utils/webhid.js';

test('WebHID Filter matches receiver A8A5:2255 collection FF01:0010', () => {
  assert.equal(FILTER.length, 1);
  assert.equal(FILTER[0].vendorId, 0xA8A5);
  assert.equal(FILTER[0].productId, 0x2255);
  assert.equal(FILTER[0].usagePage, 0xFF01);
  assert.equal(FILTER[0].usage, 0x0010);
});

test('isVendorDevice identifies valid vendor collection and rejects others', () => {
  assert.equal(isVendorDevice(null), false);
  assert.equal(isVendorDevice({ vendorId: 0x1234, productId: 0x5678 }), false);
  assert.equal(isVendorDevice({
    vendorId: 0xA8A5,
    productId: 0x2255,
    collections: [{ usagePage: 0x0001, usage: 0x0002 }], // Standard mouse pointer
  }), false);
  assert.equal(isVendorDevice({
    vendorId: 0xA8A5,
    productId: 0x2255,
    collections: [{ usagePage: 0xFF01, usage: 0x0010 }], // Vendor config
  }), true);
});

test('findVendorDevice locates vendor device in list', () => {
  const pointerDev = {
    vendorId: 0xA8A5,
    productId: 0x2255,
    collections: [{ usagePage: 0x0001, usage: 0x0002 }],
  };
  const vendorDev = {
    vendorId: 0xA8A5,
    productId: 0x2255,
    collections: [{ usagePage: 0xFF01, usage: 0x0010 }],
  };
  assert.equal(findVendorDevice([]), null);
  assert.equal(findVendorDevice([pointerDev]), null);
  assert.equal(findVendorDevice([pointerDev, vendorDev]), vendorDev);
});

test('clampDpi enforces 200 to 12,000 bounds', () => {
  assert.equal(clampDpi(50), 200);
  assert.equal(clampDpi(199), 200);
  assert.equal(clampDpi(200), 200);
  assert.equal(clampDpi(1600), 1600);
  assert.equal(clampDpi(12000), 12000);
  assert.equal(clampDpi(12001), 12000);
  assert.equal(clampDpi(16000), 12000);
});

test('validateProfile checks profile bounds and types', () => {
  assert.equal(validateProfile(DEFAULT_PROFILE), true);

  // Missing or invalid stages
  assert.throws(() => validateProfile({ ...DEFAULT_PROFILE, stages: [1000] }));
  assert.throws(() => validateProfile({ ...DEFAULT_PROFILE, stages: [100, 2400, 3200, 4800, 6400, 12000] }));
  assert.throws(() => validateProfile({ ...DEFAULT_PROFILE, stages: [1200, 2400, 3200, 4800, 6400, 13000] }));

  // Invalid active stage
  assert.throws(() => validateProfile({ ...DEFAULT_PROFILE, activeStage: 0 }));
  assert.throws(() => validateProfile({ ...DEFAULT_PROFILE, activeStage: 7 }));

  // Invalid polling rate
  assert.throws(() => validateProfile({ ...DEFAULT_PROFILE, pollingRate: 2000 }));
});

test('validateMacro checks macro structure and event ranges', () => {
  const valid = {
    name: 'Rapid Click',
    loopCount: 3,
    events: [
      { kind: 'mouse', action: 'left_down', delay_ms: 20 },
      { kind: 'mouse', action: 'left_up', delay_ms: 50 },
      { kind: 'key', action: 'KeyR', delay_ms: 100 },
    ],
  };
  assert.equal(validateMacro(valid), true);

  assert.throws(() => validateMacro({ name: '', loopCount: 1, events: [] }));
  assert.throws(() => validateMacro({ name: 'Test', loopCount: 0, events: [] }));
  assert.throws(() => validateMacro({ name: 'Test', loopCount: 101, events: [] }));
  assert.throws(() => validateMacro({
    name: 'Test',
    loopCount: 1,
    events: [{ kind: 'invalid', action: 'foo', delay_ms: 10 }],
  }));
  assert.throws(() => validateMacro({
    name: 'Test',
    loopCount: 1,
    events: [{ kind: 'key', action: 'KeyA', delay_ms: -1 }],
  }));
  assert.throws(() => validateMacro({
    name: 'Test',
    loopCount: 1,
    events: [{ kind: 'key', action: 'KeyA', delay_ms: 60001 }],
  }));
});

test('buildQuery constructs 64-byte query starting with 0x55', () => {
  const q3 = buildQuery(0x03);
  assert.equal(q3.length, 64);
  assert.equal(q3[0], 0x55);
  assert.equal(q3[1], 0x03);
  for (let i = 2; i < 64; i++) assert.equal(q3[i], 0);

  const qE = buildQuery(0x0E);
  assert.equal(qE[0], 0x55);
  assert.equal(qE[1], 0x0E);
});

test('buildLightingPacket constructs 64-byte command 0x21 packet', () => {
  const p = buildLightingPacket(3);
  assert.equal(p.length, 64);
  assert.deepEqual(Array.from(p.subarray(0, 11)), [0x55, 0x21, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03]);
});

test('buildProfileWritePacket matches confirmed capture layout', () => {
  const profile = {
    pollingRate: 1000,
    activeStage: 2,
    stages: [1200, 2400, 3200, 4800, 6400, 12000],
  };
  const packet = buildProfileWritePacket(profile);
  assert.equal(packet.length, 64);

  // Confirmed 10-byte header
  assert.deepEqual(
    Array.from(packet.subarray(0, 10)),
    [0x55, 0x0F, 0xAE, 0x0A, 0x2F, 0x01, 0x01, 0x00, 0x00, 0x00]
  );
  assert.equal(packet[10], 4); // 1000 Hz = level 4
  assert.equal(packet[11], 6); // 6 stages
  assert.equal(packet[12], 2); // active stage 2

  // DPI values in little-endian uint16
  assert.equal(packet[13] | (packet[14] << 8), 1200);
  assert.equal(packet[15] | (packet[16] << 8), 2400);
  assert.equal(packet[17] | (packet[18] << 8), 3200);
  assert.equal(packet[19] | (packet[20] << 8), 4800);
  assert.equal(packet[21] | (packet[22] << 8), 6400);
  assert.equal(packet[23] | (packet[24] << 8), 12000);
});

test('buildProfileWritePacket preserves rawBaseBytes tail exactly', () => {
  const profile = {
    pollingRate: 500,
    activeStage: 4,
    stages: [800, 1600, 2400, 3200, 6400, 8000],
  };
  const fakeBase = new Uint8Array(64);
  fakeBase[0] = 0xAA;
  fakeBase[1] = 0x0E;
  for (let i = 25; i < 64; i++) fakeBase[i] = i + 10;

  const packet = buildProfileWritePacket(profile, fakeBase);
  assert.equal(packet.length, 64);
  assert.equal(packet[10], 3); // 500 Hz = level 3
  assert.equal(packet[12], 4); // active stage 4
  for (let i = 25; i < 64; i++) {
    assert.equal(packet[i], i + 10, `Offset ${i} did not match preserved byte`);
  }
});

test('parseProfileReport extracts valid profile from AA 0E response', () => {
  const data = new Uint8Array(64);
  data[0] = 0xAA;
  data[1] = 0x0E;
  data[10] = 4; // 1000 Hz
  data[11] = 6;
  data[12] = 1; // stage 1
  const stages = [1200, 2400, 3200, 4800, 6400, 12000];
  for (let i = 0; i < 6; i++) {
    data[13 + i * 2] = stages[i] & 0xFF;
    data[14 + i * 2] = (stages[i] >> 8) & 0xFF;
  }

  const parsed = parseProfileReport(data);
  assert.equal(parsed.pollingRate, 1000);
  assert.equal(parsed.pollingLevel, 4);
  assert.equal(parsed.stageCount, 6);
  assert.equal(parsed.activeStage, 1);
  assert.deepEqual(parsed.stages, stages);
});

test('parseInputReport correctly parses streaming battery and DPI reports', () => {
  // Battery report: AA FA 00 45 38 00 00 00 D0 3D 00 ...
  const batReport = new Uint8Array(64);
  batReport.set([0xAA, 0xFA, 0x00, 0x45, 0x38, 0x00, 0x00, 0x00, 0xD0, 61, 0]);
  const bat = parseInputReport(batReport);
  assert.equal(bat.type, 'battery');
  assert.equal(bat.level, 61);
  assert.equal(bat.charging, false);

  // Charging battery report
  batReport[10] = 1;
  const batCharging = parseInputReport(batReport);
  assert.equal(batCharging.charging, true);

  // Hardware DPI toggle report: AA FA AE 24 0A 01 01 01 10 03 04 ...
  const dpiReport = new Uint8Array(64);
  dpiReport.set([0xAA, 0xFA, 0xAE, 0x24, 0x0A, 0x01, 0x01, 0x01, 0x10, 0x03, 0x04]);
  const dpiEv = parseInputReport(dpiReport);
  assert.equal(dpiEv.type, 'dpi_toggle');
  assert.equal(dpiEv.stage, 3);
  assert.equal(dpiEv.pollingRate, 1000);
});

test('DEFAULT_BUTTON_MAPPINGS decodes 8 default switch assignments', () => {
  assert.equal(DEFAULT_BUTTON_MAPPINGS.length, 8);
  const m1 = DEFAULT_BUTTON_MAPPINGS.find((b) => b.id === 'M1');
  assert.deepEqual(m1.code, [0x20, 0x01, 0x00, 0x00]);
  const m6 = DEFAULT_BUTTON_MAPPINGS.find((b) => b.id === 'M6');
  assert.deepEqual(m6.code, [0xF0, 0x01, 0x01, 0x00]);
});
