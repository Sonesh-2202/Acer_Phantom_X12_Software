# Phase 0 findings

Captured 2026-11-14 on Windows using Python 3.14.3, pip 26.3, and Git 2.52.0.

## Environment

- Created `.venv` with Python 3.14.3.
- Installed the requested packages: PyUSB, libusb-package, pyserial, PySide6, pynput, PyInstaller, pytest, and `hidapi`.
- The literal PyPI distribution named `hid` (1.0.9) is not the correct working Windows binding here: it shadows `hidapi`'s `hid` module and fails to load a native library. It was removed from the venv; `hidapi` 0.15.0 is installed and working.
- The workspace was initially not a Git repository; initialized for milestone tracking.

## Device identification

The currently attached USB composite device is **VID `A8A5`, PID `2255`**, manufacturer string `YJX-CHIP`, product string `USB Receiver`, serial `[redacted receiver serial]`, release `0x0273`. Its USB parent is `USB\\VID_A8A5&PID_2255\\[redacted]`.

This is a strong candidate for the mouse's 2.4 GHz receiver/configuration endpoint, but its product string says “USB Receiver”. The present enumeration does not prove it is the mouse connected directly by cable or identify the Acer retail model. HIDAPI enumerated 18 top-level collections across attached devices. Full inventory is in [device_map.md](device_map.md).

For `A8A5:2255`, HIDAPI reported these vendor-defined collections:

| Interface | Usage page | Usage | Likely relevance |
|---:|---:|---:|---|
| 0 | `0xFFA5` | `0x0088` | Vendor collection |
| 1 | `0xFF05` | `0x0002` | Vendor collection |
| 1 | `0xFF06` | `0x0002` | Vendor collection |
| 2 | `0xFF01` | `0x0010` | Vendor collection |

These are candidates only. No feature/output report has been sent, and no configuration protocol is established.

## Descriptor capture

Read-only HID report descriptor retrieval succeeded for the 18 enumerated collections. Raw descriptor byte strings and decoded report IDs, sizes, and main items are recorded in [hid_descriptors.md](hid_descriptors.md) and `docs/report_descriptors/`. The reported input/output/feature bit totals are descriptor payload sizes; a nonzero report ID adds its ID byte to the HID report length.

The live HID inventory did not include the Bluetooth GATT device shown by Windows PnP, so its descriptor is not captured. No separate direct-wired mouse VID/PID was identified in this pass.

## Safety and next step

Only enumeration and descriptor reads were performed. No settings writes, feature-report queries, or device configuration requests were sent. No backup snapshot was created because no readable device state has been queried yet.

Next: confirm whether the visible `A8A5:2255 USB Receiver` is the intended connected mode (and whether the mouse is currently wired, on the 2.4 GHz dongle, or paired over Bluetooth). Then search for protocol/software sources and Acer support material. If it remains unclear which collection is the configuration interface, continue with documented, read-only identification only; do not send unknown side-effect requests.
