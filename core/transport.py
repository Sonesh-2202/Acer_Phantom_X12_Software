"""Read-only HID transport for the attached YJX receiver."""

from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path

import hid

from core.protocol import (
    REPORT_SIZE,
    ActiveProfile,
    build_read_query,
    parse_active_profile,
    parse_model_firmware,
    parse_serial,
)

VID = 0xA8A5
PID = 0x2255
USAGE_PAGE = 0xFF01
USAGE = 0x0010


@dataclass(frozen=True, slots=True)
class DeviceState:
    """Read-only identity and active profile returned by the receiver."""

    vendor_id: int
    product_id: int
    product_name: str
    manufacturer: str
    usb_serial: str
    firmware_text: str
    protocol_serial: str
    profile: ActiveProfile
    captured_at: str
    raw_responses: dict[str, str]


class DeviceUnavailableError(RuntimeError):
    """Raised when the expected vendor HID collection is not connected."""


def _logger(log_dir: Path) -> logging.Logger:
    log_dir.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("phantomx12.hid")
    if not logger.handlers:
        handler = RotatingFileHandler(log_dir / "hid-audit.jsonl", maxBytes=2_000_000, backupCount=5, encoding="utf-8")
        handler.setFormatter(logging.Formatter("%(message)s"))
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False
    return logger


class ReadOnlyHidClient:
    """Read identity and profile state; intentionally has no settings-write API."""

    def __init__(self, root: Path) -> None:
        self.root = root
        self.log = _logger(root / "logs")

    @staticmethod
    def find_device() -> dict[str, object]:
        matches = [
            info for info in hid.enumerate(VID, PID)
            if info.get("interface_number") == 2
            and info.get("usage_page") == USAGE_PAGE
            and info.get("usage") == USAGE
        ]
        if not matches:
            raise DeviceUnavailableError("2.4 GHz receiver A8A5:2255 vendor interface is not connected")
        if len(matches) > 1:
            raise DeviceUnavailableError(f"Found {len(matches)} matching receiver interfaces; refusing ambiguous selection")
        return matches[0]

    @staticmethod
    def _str(value: object) -> str:
        return value.decode(errors="replace") if isinstance(value, bytes) else str(value or "")

    def _query(self, device: hid.device, command: int) -> bytes:
        request = build_read_query(command)
        # hidapi's Windows API buffer includes the no-report-ID prefix byte.
        out_buffer = b"\x00" + request
        written = device.write(out_buffer)
        self.log.info(json.dumps({
            "timestamp": datetime.now().astimezone().isoformat(),
            "direction": "OUT",
            "command": f"0x{command:02X}",
            "payload": request.hex(" ").upper(),
            "hidapi_bytes": written,
        }))
        response = bytes(device.read(REPORT_SIZE, timeout_ms=1200))
        self.log.info(json.dumps({
            "timestamp": datetime.now().astimezone().isoformat(),
            "direction": "IN",
            "command": f"0x{command:02X}",
            "payload": response.hex(" ").upper() if response else None,
        }))
        if not response:
            raise TimeoutError(f"No response to read-only query 0x{command:02X}")
        return response

    def read_state(self) -> DeviceState:
        """Query model, serial, and profile, then preserve every raw response."""
        info = self.find_device()
        handle = hid.device()
        handle.open_path(info["path"])
        try:
            model_raw = self._query(handle, 0x03)
            serial_raw = self._query(handle, 0x04)
            profile_raw = self._query(handle, 0x0E)
        finally:
            handle.close()
        return DeviceState(
            vendor_id=VID,
            product_id=PID,
            product_name=self._str(info.get("product_string", "")),
            manufacturer=self._str(info.get("manufacturer_string", "")),
            usb_serial=self._str(info.get("serial_number", "")),
            firmware_text=parse_model_firmware(model_raw),
            protocol_serial=parse_serial(serial_raw),
            profile=parse_active_profile(profile_raw),
            captured_at=datetime.now().astimezone().isoformat(),
            raw_responses={
                "0x03": model_raw.hex(" ").upper(),
                "0x04": serial_raw.hex(" ").upper(),
                "0x0E": profile_raw.hex(" ").upper(),
            },
        )

    @staticmethod
    def to_json_dict(state: DeviceState) -> dict[str, object]:
        return {
            **{key: value for key, value in asdict(state).items() if key != "profile"},
            "profile": {
                "polling_level": state.profile.polling_level,
                "polling_hz_source_mapping": state.profile.polling_hz,
                "active_stage": state.profile.active_stage,
                "dpi_stages": list(state.profile.dpi_stages),
            },
        }
