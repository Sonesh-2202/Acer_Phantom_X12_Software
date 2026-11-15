"""Tests for protocol packet construction and read-response parsing."""

import struct

import pytest

from core.protocol import (
    ActiveProfile,
    ProtocolError,
    build_read_query,
    build_source_derived_profile_write,
    parse_active_profile,
    parse_model_firmware,
    parse_serial,
)


def test_read_query_matches_known_report_bytes() -> None:
    assert build_read_query(0x03) == bytes.fromhex("55 03") + bytes(62)
    assert build_read_query(0x04) == bytes.fromhex("55 04") + bytes(62)
    assert build_read_query(0x0E) == bytes.fromhex("55 0E") + bytes(62)


def test_unknown_or_write_command_is_rejected_as_query() -> None:
    with pytest.raises(ProtocolError):
        build_read_query(0x0F)


def test_parse_active_profile_from_target_response() -> None:
    raw = bytearray(64)
    raw[0:2] = bytes.fromhex("AA 0E")
    raw[10] = 4
    raw[11] = 6
    raw[12] = 1
    struct.pack_into("<6H", raw, 13, 1200, 2400, 3200, 4800, 6400, 12000)
    result = parse_active_profile(bytes(raw))
    assert result == ActiveProfile(4, 1, (1200, 2400, 3200, 4800, 6400, 12000))
    assert result.polling_hz == 1000


def test_parse_observed_text_responses() -> None:
    model = bytearray(64)
    model[:2] = bytes.fromhex("AA 03")
    model[8:13] = b"YJX\x00\x00"
    assert parse_model_firmware(bytes(model)) == "YJX"

    serial = bytearray(64)
    serial[:2] = bytes.fromhex("AA 04")
    serial[10:20] = "D1K_1".encode("utf-16le")
    assert parse_serial(bytes(serial)) == "D1K_1"


def test_source_derived_full_profile_packet_matches_known_layout() -> None:
    profile = ActiveProfile(4, 1, (1200, 2400, 3200, 4800, 6400, 12000))
    packet = build_source_derived_profile_write(profile)
    expected = (
        bytes.fromhex("55 0F AE 0A 2F 01 01 00 00 00 04 06 01")
        + struct.pack("<6H", 1200, 2400, 3200, 4800, 6400, 12000)
        + bytes(24)
        + bytes.fromhex("FF 01 0A 01 FF 00")
        + bytes(9)
    )
    assert len(packet) == 64
    assert packet == expected


def test_source_derived_full_profile_preserves_base_report_tail() -> None:
    profile = ActiveProfile(3, 2, (800, 1600, 2400, 3200, 4800, 6400))
    base = bytearray(64)
    base[0:2] = bytes.fromhex("AA 0E")
    # Custom arbitrary tail bytes in base report
    base[25:64] = b"\x42" * 39
    packet = build_source_derived_profile_write(profile, base_report=bytes(base))
    assert len(packet) == 64
    assert packet[:10] == bytes.fromhex("55 0F AE 0A 2F 01 01 00 00 00")
    assert packet[10] == 3
    assert packet[11] == 6
    assert packet[12] == 2
    assert packet[25:64] == b"\x42" * 39


def test_profile_bounds_validation() -> None:
    with pytest.raises(ProtocolError):
        build_source_derived_profile_write(ActiveProfile(99, 1, (1200, 2400, 3200, 4800, 6400, 12000)))
    with pytest.raises(ProtocolError):
        build_source_derived_profile_write(ActiveProfile(4, 0, (1200, 2400, 3200, 4800, 6400, 12000)))
    with pytest.raises(ProtocolError):
        build_source_derived_profile_write(ActiveProfile(4, 1, (10, 2400, 3200, 4800, 6400, 12000)))
