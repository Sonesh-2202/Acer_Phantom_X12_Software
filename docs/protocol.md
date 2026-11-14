# Protocol notes — Acer Phantom X12 receiver

Status labels: **CONFIRMED (this receiver)** means observed from the user's attached `A8A5:2255` receiver using documented read-only queries. **SOURCE-DERIVED** means described in the sibling YJX receiver implementation but not yet validated with a setting write on this Acer mouse. **HYPOTHESIS / UNKNOWN** means the source does not define the field or no safe evidence is available.

## Transport and collection

| Item | Finding | Status |
|---|---|---|
| VID:PID | `A8A5:2255` (`YJX-CHIP`, product `USB Receiver`) | CONFIRMED (this receiver) |
| Configuration collection | USB interface 2, usage page `0xFF01`, usage `0x0010` | CONFIRMED (descriptor) |
| Reports | 64-byte input and 64-byte output; no report ID | CONFIRMED (descriptor) |
| Query prefix / reply prefix | Host queries start `55`; replies start `AA` and echo the command at byte 1 | CONFIRMED (read-only responses) |
| Checksum/CRC | None documented or identified in read-only exchanges; do not assume the write packet has no integrity field | UNKNOWN |
| Timing | The sibling implementation waits up to 1 second for a reply. This receiver answered all three queries in one try; exact latency not measured here. | SOURCE-DERIVED |

Offsets below are zero-based within the 64-byte report, without a report-ID byte. Query payloads are zero-padded to 64 bytes.

## Confirmed read-only queries

| Command | Request | Response/use | Status |
|---|---|---|---|
| `0x03` model/firmware text | `55 03` then zero padding | `AA 03`; printable data began at byte 8. This receiver returned `YJX.co.mouse273224Jul  9 202614:38:03Apr  7 202614:36:16`. | CONFIRMED (this receiver) |
| `0x04` serial | `55 04` then zero padding | `AA 04`; this receiver returned UTF-16LE `D1K_260709u273_A7eV1` beginning at byte 10. The preceding bytes are not decoded. | CONFIRMED (response); preceding fields UNKNOWN |
| `0x0E` active profile | `55 0E` then zero padding | `AA 0E`; see table below. | CONFIRMED (this receiver) |

### `0x0E` profile response

| Offset | Meaning | Status |
|---:|---|---|
| 0 | `AA` response marker | CONFIRMED |
| 1 | Echoed command `0E` | CONFIRMED |
| 10 | Poll rate level: sibling mapping 1/2/3/4 = 125/250/500/1000 Hz. Current value `4` corresponds to 1000 Hz. | Mapping SOURCE-DERIVED; value CONFIRMED |
| 11 | `06` in the observed response; likely stage count, meaning unconfirmed | HYPOTHESIS |
| 12 | Active DPI stage, 1-based, 1–6. Current value `1`. | SOURCE-DERIVED; value CONFIRMED |
| 13–24 | Six little-endian `uint16` DPI values. Current values: `1200, 2400, 3200, 4800, 6400, 12000`. | SOURCE-DERIVED layout; values CONFIRMED |
| 25–63 | Additional fields/tail not decoded; preserve raw bytes | UNKNOWN |

The full exchange is preserved in `backups/read-only-snapshot-20261114-161658+0530.json` and timestamped packet log in `logs/` (logs are local/ignored by Git).

The user's WebHID capture (`tools/hid-capture.json`, intentionally excluded from Git because it includes the receiver serial) confirms unsolicited `AA FA AE` DPI events from this receiver. Offset 9 is the 1-based stage and offset 10 is the polling-level value in those events; the captured stage sequence changed as the physical DPI button was pressed. This is CONFIRMED (this receiver).

## Source-derived write command — not yet enabled

The sibling implementation uses command `0x0F` to write a **complete profile**, not one field. The user's WebHID capture shows eight `0x0F` OUT/IN pairs from the related configurator to this receiver. Each OUT has a corresponding `AA 0F` response that echoes the profile data, including changes to the trailing field and active DPI stage. This confirms this receiver accepts the captured `0x0F` packet shape. It does not yet justify constructing arbitrary settings: keep all unedited bytes from a fresh `0x0E` profile response and change only fields the UI exposes and the capture maps.

Captured packet shape:

```text
55 0F AE 0A 2F 01 01 01 00 03 <poll> 06 <stage> <six little-endian DPI uint16s> [24 zero bytes] FF 01 0A 00 FF [zero padding to 64 bytes]
```

The leading bytes and the DPI/polling offsets agree with the sibling source; the response behavior and acceptance are now CONFIRMED for this receiver by the user's capture. Tail bytes at offsets 48–55 vary in the configurator traffic; preserve them exactly from the live profile and do not synthesize undocumented values. The user-generated capture includes writes made by the vendor page, not by this project.

There is no identified separate save/commit command. The sibling code treats an `AA` response as acknowledgement, but this is not validated on the Acer mouse.

## Other features

| Feature | Current evidence |
|---|---|
| Lighting effects | The related configurator visibly offers seven modes: Wave, Neon, Touring Flash, YOYO Ball, One-way Flash, Circulatory Respiration, and lights off. The screenshot shows YOYO Ball selected. This confirms the OEM UI offers effects, but exact mode IDs and command acknowledgement still need a device capture. |
| Custom RGB/ARGB color, zones, brightness, speed | Not shown in the screenshot or captured traffic; arbitrary color control remains unconfirmed. |
| Battery | CONFIRMED unsolicited event `AA FA ... D0 <percent> <charge>`; captured values were 61% then 62%, charge flag 0. Numeric battery query is not captured. |
| Button remapping | The capture includes `0x09` request/response pairs, consistent with the related page's mapping setter. The captured frames are identical repeats; specific mapping field semantics and getter state are still source-derived, not independently proven by changing a mapping. |
| Macros | Capture includes `0x0D` chunks and `0x10` acknowledgements from the vendor macro page. Chunk structure and persistence need fuller decoding before implementing upload. |
| Lift-off distance, debounce, sleep timeout | UNKNOWN. |
| Poll-rate state | Readable (`0x0E`) and currently reports level 4. Effective host event rate has not been independently measured. |
| DPI stage state | Readable (`0x0E`); current table recorded above. No write validation yet. |

This project has not sent any settings writes. Settings packets in the WebHID capture were sent by the user's related configurator.
