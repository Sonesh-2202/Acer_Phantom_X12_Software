"""Document a desired button mapping without sending an unverified packet."""

from __future__ import annotations

import argparse


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--button", type=int, required=True, help="physical button number")
    parser.add_argument("--action", required=True, help="desired action label (for example: back, key:space)")
    args = parser.parse_args()
    if not 1 <= args.button <= 16:
        parser.error("--button must be between 1 and 16")
    print(f"Requested mapping: button {args.button} -> {args.action}")
    print("No Acer button-mapping command is identified yet; no HID packet was sent.")


if __name__ == "__main__":
    main()
