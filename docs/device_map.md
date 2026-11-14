# YJX receiver HID collections

The 2.4 GHz receiver enumerates as `A8A5:2255`. This project records only its HID collections; local keyboard/display paths and serial values are excluded.

| VID:PID | Manufacturer | Product | Usage page | Usage | Interface |
|---|---|---|---:|---:|---:|
| `A8A5:2255` | YJX-CHIP | USB Receiver | `0x0001` | `0x0002` | 0 |
| `A8A5:2255` | YJX-CHIP | USB Receiver | `0x000C` | `0x0001` | 0 |
| `A8A5:2255` | YJX-CHIP | USB Receiver | `0x0001` | `0x0080` | 0 |
| `A8A5:2255` | YJX-CHIP | USB Receiver | `0xFFA5` | `0x0088` | 0 |
| `A8A5:2255` | YJX-CHIP | USB Receiver | `0x0001` | `0x0006` | 1 |
| `A8A5:2255` | YJX-CHIP | USB Receiver | `0x000C` | `0x0001` | 1 |
| `A8A5:2255` | YJX-CHIP | USB Receiver | `0x0001` | `0x0080` | 1 |
| `A8A5:2255` | YJX-CHIP | USB Receiver | `0xFF05` | `0x0002` | 1 |
| `A8A5:2255` | YJX-CHIP | USB Receiver | `0xFF06` | `0x0002` | 1 |
| `A8A5:2255` | YJX-CHIP | USB Receiver | `0xFF01` | `0x0010` | 2 |

The supported WebHID configuration collection is interface 2, usage page `0xFF01`, usage `0x0010`. See [protocol.md](protocol.md) for behavior and evidence status.
