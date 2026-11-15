# Protocol notes — Acer Phantom X12 receiver

Status labels:
- **CONFIRMED (this receiver)**: Observed directly on the user's attached `A8A5:2255` receiver via WebHID exchanges or captured traffic.
- **IMPLEMENTED & VERIFIED**: Fully implemented in the driver suite, tested with automated test suites, verified against captured hardware responses, and validated via read-back.
- **DECODED (SAFE GATED)**: Packet structure decoded from capture, but hardware write transmission is gated to protect hardware integrity.
- **PREVIEW ONLY**: Exposed in local UI preview/shaders; hardware transmission not available or not supported by mouse firmware.

---

## 1. Transport and collection

| Item | Finding | Status |
|---|---|---|
| VID:PID | `A8A5:2255` (`YJX-CHIP`, product `USB Receiver`) | CONFIRMED (this receiver) |
| Configuration collection | USB interface 2, usage page `0xFF01`, usage `0x0010` | CONFIRMED (descriptor) |
| Reports | 64-byte input and 64-byte output; report ID 0 | CONFIRMED (descriptor) |
| Query prefix / reply prefix | Host queries start with `0x55`; receiver replies start with `0xAA` and echo the command byte at index 1 | CONFIRMED (read-only & write responses) |
| Operating bounds | WebHID in Chromium (Chrome 89+, Edge 89+); requires secure context (`localhost` or HTTPS) and direct user gesture | CONFIRMED |

---

## 2. Documented queries and packet structures

All reports are 64 bytes. Offsets are zero-based.

### Command `0x03` — Model / Firmware Identification
- **Request (Host -> Receiver)**: `55 03 [62 zero bytes]`
- **Response (Receiver -> Host)**: `AA 03 [6 zero bytes] [ASCII string: "YJX.co.mouse273224..."]`
- **Status**: CONFIRMED (this receiver)

### Command `0x04` — Receiver Serial
- **Request (Host -> Receiver)**: `55 04 [62 zero bytes]`
- **Response (Receiver -> Host)**: `AA 04 [8 unknown bytes] [UTF-16LE receiver serial string]`
- **Status**: CONFIRMED (this receiver); serial string is kept private and excluded from git commits.

### Command `0x0E` — Read Active Profile
- **Request (Host -> Receiver)**: `55 0E [62 zero bytes]`
- **Response (Receiver -> Host)**: `AA 0E 00 EA 2E 00 00 00 00 00 <poll_level> 06 <active_stage> <6 x LE uint16 DPIs> [24 zero bytes] FF 01 0A <sleep_timer> FF <flag> [9 zero bytes]`
- **Decoded offsets**:
  - Offset `10`: Polling rate level: `1` = 125 Hz, `2` = 250 Hz, `3` = 500 Hz, `4` = 1000 Hz.
  - Offset `11`: Stage count (`0x06`).
  - Offset `12`: Active DPI stage (1-based, `1` to `6`).
  - Offsets `13..24`: Six little-endian uint16 values for stages 1 to 6 (default: 1200, 2400, 3200, 4800, 6400, 12000).
  - Offsets `25..48`: 24 zero bytes.
  - Offsets `49..54`: `FF 01 0A <sleep_timer> FF <flag>` (offset 52: sleep timeout, observed 0x01..0x3C; offset 54: sleep flag).
  - Offsets `55..63`: 9 zero bytes.
- **Status**: CONFIRMED (this receiver)

---

## 3. Profile write command (`0x0F`) — Implemented & Verified

Command `0x0F` writes a complete hardware profile to the receiver EEPROM.

### Confirmed packet layout (64 bytes)
```text
Offset  0..9 : 55 0F AE 0A 2F 01 01 00 00 00  (Confirmed fixed header)
Offset 10    : <polling_level>                (0x01=125Hz, 0x02=250Hz, 0x03=500Hz, 0x04=1000Hz)
Offset 11    : 06                             (Stage count)
Offset 12    : <active_stage>                 (0x01 to 0x06)
Offset 13..24: <6 x uint16 LE DPIs>           (200 to 12,000 DPI bounds, step 100)
Offset 25..63: <Preserved baseline bytes>     (Copied verbatim from fresh 0x0E read)
```

### Safety and verification discipline
1. **Fresh Read**: Prior to every write, the app queries `0x0E` to obtain the live 64-byte profile from hardware.
2. **Tail Preservation**: Bytes 25 through 63 are preserved exactly from the read report, avoiding any synthetic or guessed tail bytes.
3. **Acknowledgement**: The app transmits the 64-byte report and awaits the receiver's `AA 0F` response echoing the profile data.
4. **Pacing Delay**: A 60ms inter-command pacing delay is enforced.
5. **Read-back Verification**: A subsequent `0x0E` query reads back the state from hardware and confirms that all 6 DPI stages, active stage, and polling rate match the requested values.
6. **Status**: IMPLEMENTED & VERIFIED. Automated tests in `tests/webhid.test.js` and `tests/test_protocol.py` validate this builder and bounds checking.

---

## 4. Lighting control (`0x21`) — Implemented & Verified

- **Request (Host -> Receiver)**: `55 21 00 00 03 00 00 00 00 00 <mode_id> [53 zero bytes]`
- **Acknowledgement**: `AA 21 ...`
- **Observed Acer Phantom X12 Mode Mapping**:
  - `0`: Aurora (Flowing 360° Wave)
  - `1`: Neon Bloom (Bright dynamic color cycle)
  - `2`: Comet Rally (Touring flash)
  - `3`: Orbit Bounce (YOLO ball)
  - `4`: Photon Sweep (Unidirectional laser sweep)
  - `5`: Lumen Breath (Circulatory respiration pulse)
  - `6`: Void (Lights off / stealth battery saver)
- **Status**: IMPLEMENTED & VERIFIED on physical hardware.

### Arbitrary RGB and ARGB capabilities
- The DPI indicator LED changes color with active DPI stage preset colors.
- However, physical capture analysis revealed **no arbitrary RGB color packets** or per-zone ARGB payloads supported by this receiver.
- The Custom Color Forge is implemented as a **LOCAL PREVIEW** tool with 60 FPS shaders and local scene storage. It is clearly labeled as such to prevent user confusion.

---

## 5. Unsolicited input reports (`AA FA`)

The receiver streams unsolicited 64-byte notifications on event occurrences:

### Battery Telemetry (`0xD0`)
- **Structure**: `AA FA [unknown 6 bytes] D0 <battery_percent> <charging_flag> [zeroes]`
- **Byte 8**: `0xD0`
- **Byte 9**: Battery percentage (0..100)
- **Byte 10**: Charging state (`0` = on battery, `1` = charging)
- **Status**: CONFIRMED (this receiver). The app displays real telemetry and distinguishes `live`, `stale` (>45s), `waiting`, and `unavailable` states. No fake battery query is sent.

### Hardware DPI Switch Button Event (`0xAE`)
- **Structure**: `AA FA AE <seq> 0A 01 01 01 10 <active_stage> <polling_level> [zeroes]`
- **Byte 2**: `0xAE`
- **Byte 8**: `0x10`
- **Byte 9**: Active stage (1-based, 1..6)
- **Byte 10**: Polling rate level (1..4)
- **Status**: CONFIRMED (this receiver). Triggers audio feedback, HUD edge-flash, and syncs UI active stage immediately.

---

## 6. Button mapping protocol (`0x09`) — Decoded & Gated

The captured configurator traffic includes 27 identical request/response pairs of command `0x09`.

### Default switch table layout:
```text
55 09 A5 22 31 00 00 00
20 01 00 00   -> Button 1: Left Click (Mouse bit 0x01)
20 02 00 00   -> Button 2: Right Click (Mouse bit 0x02)
20 04 00 00   -> Button 3: Middle Click / Scroll Click (Mouse bit 0x04)
20 08 00 00   -> Button 4: Side Backward (Mouse bit 0x08)
20 10 00 00   -> Button 5: Side Forward (Mouse bit 0x10)
F0 01 01 00   -> Button 6: DPI Loop Function
21 38 01 00   -> Wheel Up: Scroll Up
21 38 FF 00   -> Wheel Down: Scroll Down
[zero padding to 64 bytes]
```
- **Safety Policy**: All observed configurator frames were identical default repeats. Writing modified `0x09` payloads to hardware is gated to prevent switch bricking or routing corruption. Remappings are saved in local profiles.

---

## 7. Macro protocol (`0x0D` / `0x10`)

- Captured traffic includes chunk fragmentation command `0x0D` (`55 0D ...`) followed by commit command `0x10` (`55 10 A5 22 00 00 00 05 ...`).
- Receiver acknowledges with `AA 0D` and `AA 10`.
- Browser WebHID boundaries prevent general system-wide keystroke injection into external OS apps without an on-device engine or native desktop helper.
- Macro editor provides local recording, event timeline editing, JSON export/import, loop counts (1..100), and storage in browser profiles. Hardware chunk upload is gated until multi-chunk EEPROM persistence is verified.

---

## 8. Summary of verified capabilities

| Feature | Implementation | Hardware Status |
|---|---|---|
| Receiver link & identification | Query `0x03`, descriptor match | Implemented & Verified |
| Read profile & polling | Query `0x0E` | Implemented & Verified |
| Write DPI & polling | Command `0x0F` + tail preservation + read-back verify | Implemented & Verified |
| Lighting presets | Command `0x21` (7 onboard modes) | Implemented & Verified |
| Custom RGB / ARGB | 60 FPS shader preview + local scenes | Preview Only (HW has 7 presets) |
| Battery telemetry | Unsolicited `AA FA ... D0` stream | Implemented & Verified |
| Hardware DPI toggle event | Unsolicited `AA FA AE ... 10` stream | Implemented & Verified |
| Button remapping | Decoded capture table + local profile mapping | Decoded (HW write gated) |
| Macro system | Local recorder/editor/import/export | Local Studio (HW upload gated) |
| System restore | Restore verified known-good baseline | Implemented & Verified |
