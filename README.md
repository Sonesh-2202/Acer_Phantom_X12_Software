# Phantom Device Studio

React + Vite WebHID control UI for the Acer Phantom X12 with the confirmed YJX 2.4 GHz receiver (`VID 0xA8A5`, `PID 0x2255`).

## Run locally

On Windows, double-click `dev.bat`, or run:

```powershell
npm ci
npm run dev
```

Open **`http://localhost:5173/`** directly in current Chrome or Edge, then press the app's Connect button and choose the YJX receiver in the browser prompt. WebHID requires a secure context and a direct user click. `localhost` is treated as secure; a LAN address such as `http://192.168...` and a page opened as `file://` are not. Firefox and Safari do not currently expose WebHID. If using the hosted app, open its HTTPS GitHub Pages address in Chrome or Edge.

The receiver should be plugged in before connecting. The app asks for the vendor configuration collection and does not select the ordinary mouse pointer collection.

## Build and preview

```powershell
npm ci
npm run build
npm run preview
```

The GitHub Pages workflow builds the Vite app and publishes `dist/`, including when hosted beneath the repository URL path.

## Device support

- Receiver: YJX `A8A5:2255`, configuration collection `FF01:0010`.
- Lighting: the seven onboard effect modes are selectable. Custom color controls currently provide a local UI preview; arbitrary color/ARGB writes need additional receiver protocol verification.
- DPI profile and battery reporting are read from observed 2.4 GHz receiver reports. Writing arbitrary DPI values and macros remains protocol work in progress.
- Wired and Bluetooth device collections have not been confirmed.
