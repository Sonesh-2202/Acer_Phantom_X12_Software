"""Validate a requested RGB colour without inventing or sending a command."""

from __future__ import annotations

import argparse
import re


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--color", required=True, help="six hexadecimal digits, e.g. ff0000")
    args = parser.parse_args()
    if not re.fullmatch(r"[0-9a-fA-F]{6}", args.color):
        parser.error("--color must contain exactly six hexadecimal digits")
    print(f"Requested preview colour: #{args.color.upper()}")
    print("No RGB command has been identified for the Acer firmware; no HID packet was sent.")


if __name__ == "__main__":
    main()
