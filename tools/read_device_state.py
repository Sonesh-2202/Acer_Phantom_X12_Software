"""Issue only documented read-only queries to the YJX A8A5:2255 receiver."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import hid

ROOT = Path(__file__).resolve().parents[1]
VID = 0xA8A5
PID = 0x2255
VENDOR_PAGE = 0xFF01
VENDOR_USAGE = 0x0010
REPORT_BYTES = 64
READ_ONLY_QUERIES = {
    "model_firmware": bytes.fromhex("55 03"),
    "serial": bytes.fromhex("55 04"),
    "active_profile": bytes.fromhex("55 0e"),
}


def clean(value: object) -> str:
    return value.decode(errors="replace") if isinstance(value, bytes) else str(value)


def main() -> None:
    stamp = datetime.now().astimezone().strftime("%Y%m%d-%H%M%S%z")
    log_dir = ROOT / "logs"
    backup_dir = ROOT / "backups"
    log_dir.mkdir(exist_ok=True)
    backup_dir.mkdir(exist_ok=True)
    log_path = log_dir / f"hid-read-{stamp}.jsonl"
    snapshot_path = backup_dir / f"read-only-snapshot-{stamp}.json"

    matches = [
        item for item in hid.enumerate(VID, PID)
        if item.get("usage_page") == VENDOR_PAGE
        and item.get("usage") == VENDOR_USAGE
        and item.get("interface_number") == 2
    ]
    if len(matches) != 1:
        raise SystemExit(f"Expected exactly one A8A5:2255 interface-2 FF01:0010 collection, found {len(matches)}")
    device = matches[0]
    handle = hid.device()
    records: list[dict[str, object]] = []

    def record(event: str, **data: object) -> None:
        with log_path.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps({"timestamp": datetime.now().astimezone().isoformat(), "event": event, **data}) + "\n")

    record(
        "open_read_only_collection",
        vid=f"{VID:04X}", pid=f"{PID:04X}", manufacturer=clean(device.get("manufacturer_string", "")),
        product=clean(device.get("product_string", "")), serial=clean(device.get("serial_number", "")),
        interface=device.get("interface_number"), usage_page=f"0x{VENDOR_PAGE:04X}",
        usage=f"0x{VENDOR_USAGE:04X}", path=clean(device["path"]),
    )
    handle.open_path(device["path"])
    try:
        for name, query in READ_ONLY_QUERIES.items():
            # HIDAPI on Windows requires a leading report-ID byte. This collection
            # has no report IDs, so zero is the transport prefix; the 64-byte HID
            # output payload itself remains the documented 64 bytes.
            payload = query + bytes(REPORT_BYTES - len(query))
            hidapi_buffer = bytes([0]) + payload
            sent_count = handle.write(hidapi_buffer)
            record("send_read_only_query", name=name, report_id=0, payload_hex=payload.hex(" ").upper(), hidapi_bytes=sent_count)
            response = handle.read(REPORT_BYTES, timeout_ms=1200)
            raw = bytes(response)
            record("receive_response", name=name, response_hex=raw.hex(" ").upper() if raw else None)
            entry: dict[str, object] = {"name": name, "query_hex": payload.hex(" ").upper(), "response_hex": raw.hex(" ").upper() if raw else None}
            if len(raw) >= 2 and raw[0] == 0xAA and raw[1] == query[1]:
                if name == "model_firmware":
                    entry["text"] = raw[8:].split(b"\x00", 1)[0].decode(errors="replace")
                elif name == "serial":
                    # This reply has an 8-byte response header followed by a
                    # two-byte length field, then UTF-16LE text.
                    text_bytes = raw[10:]
                    end = next((i for i in range(0, len(text_bytes) - 1, 2) if text_bytes[i : i + 2] == b"\x00\x00"), len(text_bytes))
                    entry["text_utf16le"] = text_bytes[:end].decode("utf-16le", errors="replace")
                elif name == "active_profile" and len(raw) >= 25:
                    entry["poll_rate_level"] = raw[10]
                    entry["active_dpi_stage"] = raw[12]
                    entry["dpi_stages"] = [int.from_bytes(raw[offset : offset + 2], "little") for offset in range(13, 25, 2)]
            records.append(entry)
    finally:
        handle.close()

    snapshot = {
        "captured_at": datetime.now().astimezone().isoformat(),
        "device": {"vid": f"{VID:04X}", "pid": f"{PID:04X}", "product": clean(device.get("product_string", "")), "serial": clean(device.get("serial_number", "")), "connection_mode": "2.4 GHz receiver (user confirmed)"},
        "queries": records,
        "limitations": "Only documented read-only requests were sent. Unanswered or unrecognized values are left raw and are not inferred.",
    }
    snapshot_path.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(snapshot, indent=2, ensure_ascii=True))
    print(f"Audit log: {log_path}")
    print(f"Read-only snapshot: {snapshot_path}")


if __name__ == "__main__":
    main()
