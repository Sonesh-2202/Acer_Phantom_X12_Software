# Phantom Device Studio

Tactical WebHID driver suite and hardware configurator for the Acer Nitro Phantom X12 wireless gaming mouse and its confirmed YJX 2.4 GHz USB receiver (`A8A5:2255`).

The shipped application is a high-performance React + Vite WebHID control panel located in `src/`. GitHub Pages automatically deploys production builds from `dist/` via `.github/workflows/pages.yml`.

Published deployment: [sonesh-2202.github.io/Acer_Phantom_X12_Software](https://sonesh-2202.github.io/Acer_Phantom_X12_Software/)

---

## Quick start

### Prerequisites
- Node.js 22+ (tested up to Node 25) and npm.
- Chromium-based browser supporting the [WebHID API](https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API) (Google Chrome 89+ or Microsoft Edge 89+). Firefox and Safari do not support WebHID.
- 2.4 GHz USB wireless receiver plugged in directly.

### Running locally

On Windows, double-click `dev.bat`, or run:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173/` in Chrome or Edge. Click **Connect receiver** and choose the YJX receiver (`USB Receiver`, VID `0xA8A5`, PID `0x2255`).

### Running tests & building

```powershell
# Run automated WebHID packet builder, parser, and validator tests
npm test

# Run Python protocol & serialization tests
python -m pytest

# Create production build for GitHub Pages
npm run build
```

---

## Hardware features & protocol implementation

| Feature | Protocol Command | Hardware Status | Notes |
|---|---|---|---|
| **Identity & Version** | `55 03` | **Verified & Live** | Reads firmware identification string from receiver |
| **Battery Telemetry** | Unsolicited `AA FA [0xD0]` | **Verified & Live** | Real streaming battery percentage & charge state; indicates live vs stale (>45s) |
| **DPI Profile Read** | `55 0E` | **Verified & Live** | Reads active stage (1–6), polling rate (125–1000 Hz), and all 6 DPI values |
| **DPI Profile Write** | `55 0F` | **Verified & Live** | Configures 6 stages (200–12,000 DPI) and polling rate; preserves raw tail bytes with read-back verification |
| **Hardware DPI Button** | Unsolicited `AA FA AE [0x10]` | **Verified & Live** | Physical button events switch active stage instantly with audio and HUD visual flash |
| **Lighting Effects** | `55 21 [MODE]` | **Verified & Live** | 7 onboard modes: Void (0), Aurora (1), Neon Bloom (2), Comet Rally (3), Orbit Bounce (4), Photon Sweep (5), Lumen Breath (6) |
| **Custom Color Sculptor**| Local Shader | **Preview Only** | 60 FPS live shader preview and local scenes. Receiver firmware does not expose arbitrary ARGB color packets |
| **Button Remapping** | `55 09` | **Decoded / Local Profile** | Default switch table decoded from capture; custom remappings saved locally to avoid EEPROM bricking |
| **Macro Studio** | Local Studio | **Local Profile** | Full interactive macro recorder, event editor, loop controls, JSON export/import |
| **System Restore** | `55 0F` / `55 21` | **Verified & Live** | Safe baseline reset (1000Hz, Stage 1, standard curve, Aurora) without risky OEM factory-reset commands |

For technical byte offsets, captures, and reverse-engineering details, see [docs/protocol.md](docs/protocol.md).

---

## Project structure

- `src/App.jsx` — Core state machine, WebHID connection lifecycle, telemetry handlers, profile management.
- `src/components/StudioCockpit.jsx` — Tactical cockpit interface: Overview, Lighting, Performance, Buttons, Macros, Profiles, System.
- `src/components/MouseHardwareVisual.jsx` — Interactive 3D/SVG CAD mouse visualizer with dynamic reactive lighting.
- `src/components/LandingPage.jsx` — Flagship landing page with GSAP scrollytelling and telemetry callouts.
- `src/utils/webhid.js` — WebHID receiver filters, report parsers, packet builders, bounds validation, and transmission helpers.
- `src/styles/hud.css` — High-tech dark tactical design system with ambient glow and responsive layouts.
- `tests/webhid.test.js` — Automated unit tests for all WebHID packet construction, bounds checking, and report decoding.
- `core/`, `services/`, `tests/` — Companion Python protocol, profile, and macro test suites.
- `tools/` — Read-only diagnostic scripts and passive WebHID capture helper (`tools/webhid_capture.js`).
- `docs/protocol.md` — Protocol documentation and verified hardware evidence table.

---

## Connection requirements & troubleshooting

1. **"WebHID needs a secure page"**: WebHID requires a secure context. The app works on `http://localhost:5173/` or any HTTPS domain (such as GitHub Pages). Plain network IPs (e.g. `http://192.168...`) are blocked by Chromium security policies.
2. **"This browser does not expose WebHID"**: Use Google Chrome or Microsoft Edge. Firefox, Safari, and mobile browsers do not implement WebHID.
3. **Device not appearing in picker**: Ensure the 2.4 GHz USB dongle is connected directly to your computer. The WebHID filter is specifically restricted to `VID 0xA8A5`, `PID 0x2255`, `usagePage 0xFF01`, `usage 0x0010` to avoid Windows permission errors with OS-protected pointer endpoints (`usagePage 0x0001`).
4. **Battery shows "Waiting 0xD0"**: The receiver broadcasts battery telemetry periodically as unsolicited reports. The app waits for the first real report rather than showing hardcoded numbers.
5. **Read-back verification error**: If a profile write is interrupted, the app verifies the hardware state with a read-back query and alerts you if any value does not match.

---

## Privacy and data handling

- **No external telemetry**: The application sends zero device data or analytics to any external server.
- **Local storage**: Custom profiles, lighting scenes, button assignments, and macros are stored strictly in your browser's local storage (`localStorage`).
- **External assets**: Fonts are loaded from Google Fonts CDN (`fonts.googleapis.com`). All code and images are hosted directly from GitHub Pages or locally.
- **Hardware safety**: Settings packets preserve unknown tail bytes from baseline reads. Arbitrary or unverified commands (such as vendor factory-reset writes) are strictly excluded.

---

## License & disclaimer

This project is licensed under the [MIT License](LICENSE).

*Disclaimer*: Phantom Device Studio is an independent open-source utility developed for hardware tuning and accessibility. Acer, Nitro, and related trademarks are the property of their respective owners. This project is not affiliated with, endorsed by, or sponsored by Acer Inc.
