# Agent notes

## Active application

- The shipped product is the React + Vite app in `src/`. GitHub Pages publishes `dist/` through `.github/workflows/pages.yml`.
- Start with `npm ci`, then `npm run dev`. Use `http://localhost:5173/` in Chrome or Edge for WebHID.
- Do not restore or edit the retired `web/` app. Do not reintroduce Qt/PyInstaller packaging; the project moved to a browser app.
- Keep the Pages `base: './'` setting in `vite.config.js`; the app is hosted below a repository path.

## Hardware evidence

- The user's confirmed receiver is YJX `A8A5:2255`, WebHID collection `FF01:0010` (USB interface 2 in the captured descriptor). The mouse is connected through its 2.4 GHz receiver.
- The receiver filter must remain specific to this VID/PID/collection. Do not fall back to arbitrary HID devices or the standard mouse pointer collection.
- Read-only model, serial, and DPI-profile queries are documented in `docs/protocol.md`. Battery and DPI-button reports were observed on this receiver.
- The seven lighting mode IDs are user-observed on this mouse and mapped in `src/utils/webhid.js` (Command `0x21`).
- Profile writes use Command `0x0F` with the verified header `55 0F AE 0A 2F 01 01 00 00 00`, copy unedited baseline bytes (offsets 25..63) verbatim from a fresh `0x0E` query, await `AA 0F` acknowledgement, and run read-back verification.
- Do not present custom color, ARGB zones, button remapping, or macro upload as verified hardware control. The mouse firmware exposes seven preset lighting modes only. Button mappings and macros are safely managed locally.
- `tools/hid-capture.json`, `backups/`, and `logs/` can contain hardware identifiers. They are deliberately ignored; never add them to commits without explicit review.

## Useful locations

- `src/App.jsx`: connection lifecycle, report handlers, app state.
- `src/utils/webhid.js`: HID filters, protocol packet builders, effect map.
- `src/components/`: React screens and controls.
- `core/`, `services/`, `tests/`: separate Python protocol/profile/macro exploration; the web app does not import these modules.
- `tools/`, `docs/`: hardware diagnostics and protocol evidence.

## Change discipline

- Prefer focused edits and keep the README and this file aligned with actual behavior.
- Treat any packet sent to the receiver as a hardware write unless it is one of the documented read-only queries. Do not test unknown writes against the user's mouse.
- Do not commit generated output, dependency directories, serial-bearing captures, backups, or logs.
