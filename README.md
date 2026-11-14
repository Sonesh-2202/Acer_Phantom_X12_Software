# Acer Phantom X12 Control

A Windows desktop utility for investigating and configuring the Acer Nitro Phantom X12 mouse. The connected 2.4 GHz receiver identifies as `YJX-CHIP A8A5:2255`.

## Current status

The current build is a read-only prototype. It reads receiver identity, polling rate, active DPI stage, and six DPI values. The user's WebHID capture confirms this receiver emits DPI-stage and battery events, and that the related K-Snake page's profile packets receive acknowledgements. The app does not yet use these new findings to change settings or show live battery.

**No settings write has been sent by this project.** Polling and DPI editing stay disabled until the full Acer write format is understood and validated. RGB and other fields are never faked as device-supported.

## Run from source

```powershell
py -3.14 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
python main.py
```

The receiver should remain connected through its 2.4 GHz USB dongle. No special driver is installed or required by this utility.

## Supported feature matrix

| Feature | 2.4 GHz receiver | Wired | Bluetooth | Status |
|---|---|---|---|---|
| Device identity / firmware text | Yes | Not enumerated | Not enumerated | Read verified on receiver |
| Active DPI stage and six values | Yes | Not enumerated | Not enumerated | Reads verified; vendor-page write shape captured, app writes not enabled |
| DPI adjustment range | 2.4 GHz receiver | Unknown | Unknown | OEM page shows slider 200–12000 DPI; app-side write not validated |
| Polling-rate setting | Yes | Not enumerated | Not enumerated | Receiver reports 1000 Hz; vendor-page profile writes captured, app writes not enabled |
| Lighting effects | Candidate UI exists in related OEM site | Unknown | Unknown | Seven effects visible; exact command and app control unvalidated |
| Custom RGB/ARGB colour/brightness | Unknown | Unknown | Unknown | No custom color control visible in the screenshot or capture |
| Battery level | Yes | Unknown | Unknown | Unsolicited events captured at 61–62%; app does not yet display live value |
| Hardware button mappings/macros | Candidate UI exists in related OEM site | Unknown | Unknown | Vendor-page traffic captured; packet semantics and app upload unvalidated |
| Software-mode remapping | Not enabled yet | App required | App required | Planned; not stored in the mouse |
| Local profiles and macro JSON | Local only | Local only | Local only | Basic serialization available; no device sync |

“Not enumerated” means that mode has not been connected and captured on this machine. It is not a claim that the hardware lacks the feature.

## HID capture for the OEM configurator

The related [K-Snake X11 configurator](https://x1a11.yjx2012.com/) recognizes a YJX mouse and exposes DPI, polling, lighting, button, and macro pages. It is not an Acer-branded tool. To record its WebHID reports without applying settings, follow [the capture instructions](docs/webhid_capture_instructions.md) and run the passive logger in `tools/webhid_capture.js`.

Do not use factory reset, firmware update, Apply, or Confirm controls during protocol capture. The logger itself only observes and forwards WebHID calls unchanged.

## Diagnostics and backups

- `tools/enumerate_hid.py` records attached HID collections and raw report descriptors.
- `tools/read_device_state.py` sends only the documented read-only queries `0x03`, `0x04`, and `0x0E`, and saves raw responses under `logs/` and `backups/`.
- HID packet logs rotate under `logs/` when using the application. The first read-only snapshot is kept under `backups/` and excluded from Git because it contains the device serial.
- Protocol status and packet offsets are documented in [docs/protocol.md](docs/protocol.md).

## Tests

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

## Build

Run `build.bat` to create `dist\AcerPhantomX12Control\AcerPhantomX12Control.exe` and its required Qt runtime files. Keep the whole folder together when moving the app. `uninstall.bat` removes the app executable and leaves profile, log, and backup data intact.

## Contributing captures

Attach the JSON produced by the steps in [docs/webhid_capture_instructions.md](docs/webhid_capture_instructions.md). Include screenshots of the initial device page and note whether the physical mouse was in 2.4 GHz, wired, or Bluetooth mode. Keep captures of one settings change at a time, and do not send unknown packets manually.
