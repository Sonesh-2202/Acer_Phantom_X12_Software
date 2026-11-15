"""Known YJX receiver protocol primitives.

Only commands 0x03, 0x04, and 0x0E are documented as read-only and have been
observed to reply on this receiver. The 0x0F packet builder is source-derived
from a sibling mouse and deliberately has no transport/write helper here.
"""

from __future__ import annotations

import struct
from dataclasses import dataclass

REPORT_SIZE = 64
POLL_LEVEL_TO_HZ = {1: 125, 2: 250, 3: 500, 4: 1000}
POLL_HZ_TO_LEVEL = {hz: level for level, hz in POLL_LEVEL_TO_HZ.items()}
READ_ONLY_COMMANDS = frozenset({0x03, 0x04, 0x0E})


class ProtocolError(ValueError):
    """Raised when a device report does not match the documented structure."""


@dataclass(frozen=True, slots=True)
class ActiveProfile:
    """Fields decoded from the observed 0x0E profile response."""

    polling_level: int
    active_stage: int
    dpi_stages: tuple[int, int, int, int, int, int]

    @property
    def polling_hz(self) -> int:
        """Return the sibling-source polling mapping for this level."""
        try:
            return POLL_LEVEL_TO_HZ[self.polling_level]
        except KeyError as exc:
            raise ProtocolError(f"Unknown polling level: {self.polling_level}") from exc


def build_read_query(command: int) -> bytes:
    """Build a zero-padded 64-byte request for a documented read-only command."""
    if command not in READ_ONLY_COMMANDS:
        raise ProtocolError(f"Command 0x{command:02X} is not an approved read-only query")
    return bytes((0x55, command)) + bytes(REPORT_SIZE - 2)


def validate_response(response: bytes, command: int) -> bytes:
    """Validate exact-length reply marker and echoed command; return raw bytes."""
    if len(response) != REPORT_SIZE:
        raise ProtocolError(f"Expected {REPORT_SIZE}-byte response, got {len(response)}")
    if response[0] != 0xAA or response[1] != command:
        raise ProtocolError("Response marker/command echo did not match")
    return response


def parse_model_firmware(response: bytes) -> str:
    """Decode the observed ASCII string region from the 0x03 response."""
    raw = validate_response(response, 0x03)[8:]
    return raw.split(b"\x00", 1)[0].decode("ascii", errors="replace").rstrip()


def parse_serial(response: bytes) -> str:
    """Decode the observed UTF-16LE serial region from the 0x04 response.

    The two bytes immediately before the string are retained as unknown; the
    target receiver's string begins at offset 10.
    """
    raw = validate_response(response, 0x04)[10:]
    end = next((i for i in range(0, len(raw) - 1, 2) if raw[i : i + 2] == b"\x00\x00"), len(raw))
    return raw[:end].decode("utf-16le", errors="replace")


def parse_active_profile(response: bytes) -> ActiveProfile:
    """Decode polling level, active stage, and six DPI values from 0x0E."""
    raw = validate_response(response, 0x0E)
    try:
        dpi = struct.unpack_from("<6H", raw, 13)
    except struct.error as exc:
        raise ProtocolError("Profile response is truncated") from exc
    profile = ActiveProfile(raw[10], raw[12], dpi)  # type: ignore[arg-type]
    if profile.polling_level not in POLL_LEVEL_TO_HZ:
        raise ProtocolError(f"Unknown polling level: {profile.polling_level}")
    if not 1 <= profile.active_stage <= 6:
        raise ProtocolError(f"Invalid active DPI stage: {profile.active_stage}")
    if any(value == 0 for value in profile.dpi_stages):
        raise ProtocolError("DPI table contains a zero value")
    return profile


def build_source_derived_profile_write(profile: ActiveProfile, base_report: bytes | None = None) -> bytes:
    """Build the confirmed 0x0F full-profile packet.

    The header 55 0F AE 0A 2F 01 01 00 00 00 is confirmed in the WebHID capture.
    When base_report is provided from a fresh 0x0E read, all trailing bytes (offsets 25..63)
    are preserved exactly without synthesizing unknown values.
    """
    if profile.polling_level not in POLL_LEVEL_TO_HZ:
        raise ProtocolError(f"Unknown polling level: {profile.polling_level}")
    if not 1 <= profile.active_stage <= 6:
        raise ProtocolError(f"Invalid active DPI stage: {profile.active_stage}")
    if any(not 50 <= dpi <= 12000 for dpi in profile.dpi_stages):
        raise ProtocolError("DPI values must be between 50 and 12000")

    packet = bytearray(REPORT_SIZE)
    packet[:10] = bytes.fromhex("55 0F AE 0A 2F 01 01 00 00 00")
    packet[10] = profile.polling_level
    packet[11] = 0x06
    packet[12] = profile.active_stage
    struct.pack_into("<6H", packet, 13, *profile.dpi_stages)

    if base_report is not None:
        if len(base_report) != REPORT_SIZE:
            raise ProtocolError(f"base_report must be {REPORT_SIZE} bytes")
        packet[25:64] = base_report[25:64]
    else:
        # Default observed tail bytes from capture (24 zeros + FF 01 0A 01 FF 00 + zeros)
        packet[49:55] = bytes.fromhex("FF 01 0A 01 FF 00")

    return bytes(packet)
