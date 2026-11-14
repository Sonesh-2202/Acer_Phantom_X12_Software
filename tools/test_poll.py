"""Safely prepare a polling change; transmission stays locked pending capture."""

from __future__ import annotations

import argparse
from pathlib import Path

from core.protocol import (
    POLL_HZ_TO_LEVEL,
    ActiveProfile,
    build_source_derived_profile_write,
)
from core.transport import ReadOnlyHidClient


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hz", type=int, required=True, choices=(125, 250, 500, 1000))
    parser.add_argument("--dry-run", action="store_true", help="print the sibling-source candidate packet; never send it")
    args = parser.parse_args()
    if not args.dry_run:
        parser.error("settings writes are locked until the Acer packet is validated; add --dry-run to inspect only")
    state = ReadOnlyHidClient(Path(__file__).resolve().parents[1]).read_state()
    candidate = ActiveProfile(POLL_HZ_TO_LEVEL[args.hz], state.profile.active_stage, state.profile.dpi_stages)
    packet = build_source_derived_profile_write(candidate)
    print(f"Current receiver profile reports {state.profile.polling_hz} Hz.")
    print(f"Requested polling level: {args.hz} Hz.")
    print(f"Source-derived candidate (not transmitted): {packet.hex(' ').upper()}")
    print("No settings write was sent: fixed bytes and tail are not yet validated for this Acer firmware.")


if __name__ == "__main__":
    main()
