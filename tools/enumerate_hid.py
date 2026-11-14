"""Enumerate HID collections and save their raw report descriptors (read-only)."""

from __future__ import annotations

from collections import defaultdict
from pathlib import Path

import hid

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
RAW = DOCS / "report_descriptors"


def decode_descriptor(data: list[int]) -> tuple[dict[int, dict[str, int]], list[str]]:
    """Return report bit lengths and a human-readable item listing."""
    reports: dict[int, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    lines: list[str] = []
    globals_: dict[str, int] = {"usage_page": 0, "report_size": 0, "report_count": 0, "report_id": 0}
    local_usage: int | None = None
    pos = 0
    while pos < len(data):
        prefix = data[pos]
        pos += 1
        if prefix == 0xFE:
            if pos + 2 > len(data):
                break
            size, tag = data[pos], data[pos + 1]
            pos += 2 + size
            lines.append(f"Long item tag 0x{tag:02X}, {size} bytes")
            continue
        size_code = prefix & 0x03
        size = (0, 1, 2, 4)[size_code]
        item_type = (prefix >> 2) & 0x03
        tag = (prefix >> 4) & 0x0F
        if pos + size > len(data):
            break
        value = int.from_bytes(bytes(data[pos : pos + size]), "little") if size else 0
        pos += size
        if item_type == 1:
            name = {0: "usage_page", 7: "report_size", 8: "report_id", 9: "report_count"}.get(tag)
            if name:
                globals_[name] = value
                lines.append(f"Global {name} = 0x{value:X}" if name == "usage_page" else f"Global {name} = {value}")
            elif tag == 10:
                lines.append(f"Global collection stack push (0x{value:X})")
            elif tag == 11:
                lines.append("Global collection stack pop")
        elif item_type == 2 and tag == 0:
            local_usage = value
            lines.append(f"Local usage = 0x{value:X}")
        elif item_type == 0:
            if tag == 10:
                lines.append(f"Collection type 0x{value:X} (usage page 0x{globals_['usage_page']:X}, usage {local_usage})")
                local_usage = None
            elif tag == 12:
                lines.append("End collection")
            elif tag in (8, 9, 11):
                kind = {8: "input", 9: "output", 11: "feature"}[tag]
                count = globals_["report_size"] * globals_["report_count"]
                reports[globals_["report_id"]][kind] += count
                lines.append(
                    f"{kind.title()} report ID {globals_['report_id']}, {globals_['report_size']} bits × "
                    f"{globals_['report_count']} = {count} bits (main flags 0x{value:X}; usage page 0x{globals_['usage_page']:X})"
                )
    return reports, lines


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    devices = hid.enumerate(0xA8A5, 0x2255)
    map_lines = ["# YJX receiver HID collections", "", "Captured through read-only hidapi enumeration. Collection paths and serial values are deliberately omitted.", "", "| VID:PID | Manufacturer | Product | Usage page | Usage | Interface | Bus |", "|---|---|---|---:|---:|---:|---:|"]
    descriptor_lines = ["# YJX receiver report descriptors", "", "Descriptors were retrieved with hidapi's read-only `get_report_descriptor()` call. Only the confirmed `A8A5:2255` receiver is enumerated; host keyboard and display collections are excluded.", ""]
    for info in devices:
        vid, pid = info["vendor_id"], info["product_id"]
        path = info["path"]
        def val(key: str, current: dict[str, object] = info) -> str:
            value = current.get(key, "")
            return value.decode(errors="replace") if isinstance(value, bytes) else str(value or "")
        map_lines.append(
            f"| `{vid:04X}:{pid:04X}` | {val('manufacturer_string')} | {val('product_string')} | "
            f"`0x{info.get('usage_page', 0):04X}` | `0x{info.get('usage', 0):04X}` | {info.get('interface_number', -1)} | {info.get('bus_type', '')} |"
        )
        handle = hid.device()
        try:
            handle.open_path(path)
            descriptor = handle.get_report_descriptor()
        except (OSError, ValueError) as exc:  # Record inaccessible interfaces rather than silently omit them.
            descriptor_lines += [f"## {vid:04X}:{pid:04X} interface {info.get('interface_number')} usage 0x{info.get('usage_page', 0):04X}:0x{info.get('usage', 0):04X}", "", f"Could not retrieve descriptor: `{type(exc).__name__}: {exc}`", ""]
            continue
        finally:
            handle.close()
        safe_name = f"{vid:04X}_{pid:04X}_mi{info.get('interface_number', -1)}_up{info.get('usage_page', 0):04X}_u{info.get('usage', 0):04X}.txt"
        raw_path = RAW / safe_name
        raw_path.write_text(" ".join(f"{byte:02X}" for byte in descriptor) + "\n", encoding="ascii")
        reports, decoded = decode_descriptor(descriptor)
        report_summary = "; ".join(
            f"ID {report_id}: " + ", ".join(f"{kind} {bits // 8} B ({bits} bits)" for kind, bits in kinds.items())
            for report_id, kinds in sorted(reports.items())
        ) or "No report main items decoded"
        descriptor_lines += [
            f"## {vid:04X}:{pid:04X} — {val('manufacturer_string')} / {val('product_string')}",
            "",
            f"- Interface: {info.get('interface_number')}; collection usage: `0x{info.get('usage_page', 0):04X}:0x{info.get('usage', 0):04X}`",
            f"- Descriptor length: {len(descriptor)} bytes; {report_summary}",
            f"- Raw bytes: [`{safe_name}`](report_descriptors/{safe_name})",
            "- Decoded items:",
            "```text",
            *decoded,
            "```",
            "",
        ]
    (DOCS / "device_map.md").write_text("\n".join(map_lines) + "\n", encoding="utf-8")
    (DOCS / "hid_descriptors.md").write_text("\n".join(descriptor_lines), encoding="utf-8")
    print(f"Enumerated {len(devices)} YJX receiver collections; saved descriptors under {RAW}")


if __name__ == "__main__":
    main()
