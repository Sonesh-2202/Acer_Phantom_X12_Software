# Phantom Device Studio

React + Vite WebHID control panel for the Acer Phantom X12 and its confirmed YJX 2.4 GHz receiver (`A8A5:2255`). The GitHub Pages deployment builds from this app; `src/` is the only active UI source.

## Run the app

Requirements: Node.js 22.12+ and npm. On Windows, double-click `dev.bat`, or run:

```powershell
npm ci
npm run dev
```

Open `http://localhost:5173/` directly in current Chrome or Edge. Connect the receiver's 2.4 GHz dongle, click **Connect**, and choose the YJX receiver in the browser picker. WebHID requires a secure context and a direct click: `localhost` and the HTTPS GitHub Pages site work; `file://`, ordinary LAN HTTP addresses, Firefox, and Safari do not.

The Pages build is published at [sonesh-2202.github.io/Acer_Phantom_X12_Software](https://sonesh-2202.github.io/Acer_Phantom_X12_Software/).

## Project map

- `src/App.jsx` — app state, receiver connection, report parsing, lighting command dispatch.
- `src/components/` — landing page, studio controls, hardware visual, and modals.
- `src/utils/webhid.js` — verified receiver filter and WebHID packet helpers.
- `src/styles/hud.css` — app styles.
- `public/assets/` — production images.
- `core/`, `services/`, `tests/` — Python protocol, profile, and macro experiments; these are not imported by the web app.
- `tools/` — read-only HID diagnostics and passive WebHID capture helper.
- `docs/protocol.md` — evidence labels and current protocol findings. `docs/report_descriptors/` contains captured descriptors.

## Build and publish

```powershell
npm run build
npm run preview
```

GitHub Actions runs `npm ci` and `npm run build` on pushes to `main`, then publishes `dist/`. The Vite base path is relative so assets resolve under the repository's Pages subpath.

## Verified device behavior and limits

- The confirmed WebHID target is receiver `VID 0xA8A5`, `PID 0x2255`, configuration collection `usagePage 0xFF01`, `usage 0x0010`.
- The UI reads DPI stage/profile and battery updates and can select the seven user-observed onboard lighting modes.
- Arbitrary DPI writes, custom-color/ARGB writes, button remapping, and macro upload are not implemented as verified hardware operations. Color controls that are preview-only must not be described as hardware writes.
- Wired and Bluetooth collections have not been confirmed.

## Local captures and diagnostics

Python tools require Python 3.11+; install `requirements-dev.txt` in a virtual environment to use the diagnostics and protocol tests. `tools/read_device_state.py` sends only the documented read-only receiver queries. `tools/enumerate_hid.py` records descriptors for the YJX receiver only and omits serials and paths. `tools/webhid_capture.js` is a passive logger for the related OEM configurator. `tools/prepare_poll_profile.py`, `tools/preview_color.py`, and `tools/describe_button_mapping.py` are offline planning helpers; they do not write to the receiver.

Raw captures, receiver serials, backups, and logs are local-only. `tools/hid-capture.json`, `backups/`, and `logs/` are ignored by Git; review captures for device identifiers before sharing them.
