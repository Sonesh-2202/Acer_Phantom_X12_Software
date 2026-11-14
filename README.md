# Phantom Device Studio

A browser UI for the Acer Nitro Phantom X12 mouse. The 2.4 GHz receiver identifies as `YJX-CHIP A8A5:2255`. [Open the GitHub Pages app](https://sonesh-2202.github.io/Acer_Phantom_X12_Software/). Electron packaging comes after device controls are validated.

## Current status

The web UI reads receiver identity, polling level, active DPI stage, and six DPI values. It parses the captured battery events and DPI button events. The user verified the lighting command on the Acer and supplied the actual pattern mapping. The custom color creator previews and saves scenes locally; the custom color write command remains unknown.

The lighting page maps each command to the pattern the user observed on this Acer. Polling and DPI editing remain locked until profile writes are validated. Applying a lighting mode is an explicit user action in the web UI.

## Run the web UI

1. Open the GitHub Pages link above, or double-click `start-web.bat` for the local version (`http://localhost:8765/`).
2. Use Chrome or Edge for WebHID.
3. Close the K-Snake configurator tab if it is connected, then click **Connect receiver** and select the `A8A5:2255` receiver.
4. If using the local version, leave its console window open. Close it to stop the server.

The first page shows receiver-reported DPI and battery updates. Battery can display as percentage, bar, or both; the bar is green above 20% and red at 20% or below. The Lighting page includes seven OEM effects and a custom color/animation preview. **Save scene locally** stores the scene in that browser. Custom-color device output is intentionally disabled while the color packet is unknown. The effect command is source-derived and awaits a receiver-side check.

WebHID requires a Chromium-based browser and an explicit device choice. The hosted site uses HTTPS; the local version uses `localhost`. It will not work by double-clicking `web/index.html` or in Firefox/Safari.

The receiver should remain connected through its 2.4 GHz USB dongle. No special driver is installed or required by the web UI.

## Supported feature matrix

| Feature | 2.4 GHz receiver | Wired | Bluetooth | Status |
|---|---|---|---|---|
| Device identity / firmware text | Yes | Not enumerated | Not enumerated | Read verified on receiver |
| Active DPI stage and six values | Yes | Not enumerated | Not enumerated | Reads verified; vendor-page write shape captured, app writes not enabled |
| DPI adjustment range | 2.4 GHz receiver | Unknown | Unknown | OEM page shows slider 200–12000 DPI; app-side write not validated |
| Polling-rate setting | Yes | Not enumerated | Not enumerated | Receiver reports 1000 Hz; vendor-page profile writes captured, app writes not enabled |
| Lighting effects | Candidate UI exists in related OEM site | Unknown | Unknown | Seven effect IDs found in configurator source; app has a WebHID apply path pending receiver validation |
| Custom RGB colour/brightness | Unknown | Unknown | Unknown | Profile metadata hints at single-color steady/breathing; custom color packet still unknown |
| ARGB zones | Unknown | Unknown | Unknown | Zone support/layout not identified |
| Battery level | Yes | Unknown | Unknown | Live unsolicited events; web UI displays percentage, bar, or both |
| Hardware button mappings/macros | Candidate UI exists in related OEM site | Unknown | Unknown | Vendor-page traffic captured; packet semantics and app upload unvalidated |
| Software-mode remapping | Not enabled yet | App required | App required | Planned; not stored in the mouse |
| Local profiles and macro JSON | Local only | Local only | Local only | Basic serialization available; no device sync |

“Not enumerated” means that mode has not been connected and captured on this machine. It is not a claim that the hardware lacks the feature.

## HID capture for the OEM configurator

The related [K-Snake X11 configurator](https://x1a11.yjx2012.com/) recognizes a YJX mouse and exposes DPI, polling, lighting, button, and macro pages. It is not an Acer-branded tool. The user's capture is preserved locally as `tools/hid-capture.json` and ignored by Git because it contains receiver identifiers. For a new passive capture, follow [the capture instructions](docs/webhid_capture_instructions.md) and use `tools/webhid_capture.js`.

Do not use factory reset, firmware update, Apply, or Confirm controls during protocol capture. The logger itself only observes and forwards WebHID calls unchanged.

## Diagnostics and backups

- `tools/enumerate_hid.py` records attached HID collections and raw report descriptors.
- `tools/read_device_state.py` sends only the documented read-only queries `0x03`, `0x04`, and `0x0E`, and saves raw responses under `logs/` and `backups/`.
- Read-only snapshots and diagnostic logs stay under `backups/` and `logs/`. Those local artifacts are excluded from Git.
- Protocol status and packet offsets are documented in [docs/protocol.md](docs/protocol.md).

## Development checks

```powershell
py -3 -m pip install -r requirements-dev.txt
py -3 -m pytest -q
```

## Packaging

Electron packaging is postponed until WebHID lighting and custom-color support have been mapped and validated. The current app is a static site and does not need a bundled Python or Qt runtime.

## Contributing captures

Attach the JSON produced by the steps in [docs/webhid_capture_instructions.md](docs/webhid_capture_instructions.md). Include screenshots of the initial device page and note whether the physical mouse was in 2.4 GHz, wired, or Bluetooth mode. Keep captures of one settings change at a time, and do not send unknown packets manually.
