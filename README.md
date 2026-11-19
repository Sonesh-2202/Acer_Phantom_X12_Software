<p align="center">
  <img src="public/favicon.svg" width="88" height="88" alt="Acer Phantom X12 icon">
</p>

<h1 align="center">Acer Phantom X12</h1>

<p align="center">
  Browser-based controls for the Acer Nitro Phantom X12 wireless mouse.
  <br>
  Adjust DPI, polling rate, and built-in lighting presets from one clean interface.
</p>

<p align="center">
  <a href="https://sonesh-2202.github.io/Acer_Phantom_X12_Software/">Open the app</a>
  · <a href="https://sonesh2202.me">Sonesh's website</a>
  · <a href="https://github.com/Sonesh-2202/Acer_Phantom_X12_Software/issues">Report an issue</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white" alt="React 19">
  <img src="https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white" alt="Vite 8">
  <img src="https://img.shields.io/badge/License-MIT-84cc16.svg" alt="MIT License">
</p>

---

## What it does

- Reads the active DPI stage, six DPI values, and receiver polling rate.
- Changes DPI stages and polling rate, then verifies the updated profile.
- Applies the mouse's seven built-in lighting presets.
- Displays battery and charging information when the receiver reports it.
- Saves named profiles in the browser and supports profile import and export.
- Shows live DPI, polling rate, and battery values beside the mouse image.
- Includes dark and light themes.

The app is designed for the YJX 2.4 GHz USB receiver supplied with the mouse. Use a Chromium browser with WebHID support, such as Chrome or Edge.

## Get started

### Requirements

- Node.js 22 or newer and npm.
- Google Chrome or Microsoft Edge.
- The mouse's 2.4 GHz USB receiver.
- A secure context: localhost for development, or HTTPS for the hosted app.

### Run locally

```bash
git clone https://github.com/Sonesh-2202/Acer_Phantom_X12_Software.git
cd Acer_Phantom_X12_Software
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), select **Connect receiver**, and choose the YJX receiver in the browser prompt.

### Build and check

```bash
npm run build
npm test
```

## Hardware support

| Control | Status |
| --- | --- |
| Read six DPI stages and the active stage | Supported |
| Set DPI stages and polling rate | Supported, with read-back verification |
| Switch among the built-in lighting presets | Supported |
| Read receiver battery and charging reports | Supported when data is available |
| Reassign mouse buttons | Not available |
| Set custom RGB colors or lighting zones | Not available |

Profile changes are sent to the mouse when you apply them. Saved profiles and theme preferences are stored locally in the browser. The System page contains the developer's UPI QR code and payment ID.

For packet layouts and evidence notes, see [docs/protocol.md](docs/protocol.md).

## Project layout

```text
src/
  App.jsx                         App state and device connections
  components/StudioCockpit.jsx    Device controls and profile management
  components/MouseHardwareVisual.jsx  Mouse image and live readings
  components/LandingPage.jsx      Product page and receiver connection
  utils/webhid.js                 HID filters, parsers, and profile writes
  styles/hud.css                  Interface styles
public/
  favicon.svg                     Browser tab icon
  upi-qr.png                      UPI payment QR code
  assets/                         Mouse images
```

The GitHub Pages workflow builds and publishes the Vite app from `dist/`.

## Privacy and safety

- Device communication happens locally between the browser and the selected HID device.
- The app does not send mouse data or analytics to an external server.
- Profile writes preserve unedited bytes from a fresh hardware read and verify the result.
- Button remapping and arbitrary lighting writes are not exposed as supported controls.

## License

Released under the [MIT License](LICENSE). Acer and Nitro are trademarks of Acer Inc. This independent project is not affiliated with or endorsed by Acer.
