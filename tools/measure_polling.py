"""Estimate Windows mouse movement event intervals without changing settings."""

from __future__ import annotations

import argparse
import json
from statistics import median
from time import monotonic, monotonic_ns, sleep

from pynput import mouse


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seconds", type=float, default=5.0, help="measurement duration (default: 5 seconds)")
    args = parser.parse_args()
    if not 1 <= args.seconds <= 60:
        parser.error("--seconds must be between 1 and 60")

    intervals_ms: list[float] = []
    previous: int | None = None

    def on_move(_x: int, _y: int) -> None:
        nonlocal previous
        now = monotonic_ns()
        if previous is not None:
            intervals_ms.append((now - previous) / 1_000_000)
        previous = now

    print(f"Move the mouse continuously for {args.seconds:.1f} seconds; measuring Windows pointer movement callback intervals.")
    start = monotonic()
    with mouse.Listener(on_move=on_move) as listener:
        while monotonic() - start < args.seconds:
            sleep(0.02)
        listener.stop()
    if not intervals_ms:
        print("No movement events captured. Try moving the mouse across the screen and run again.")
        return
    sorted_values = sorted(intervals_ms)
    result = {
        "samples": len(intervals_ms),
        "median_interval_ms": round(median(intervals_ms), 3),
        "mean_interval_ms": round(sum(intervals_ms) / len(intervals_ms), 3),
        "minimum_interval_ms": round(sorted_values[0], 3),
        "maximum_interval_ms": round(sorted_values[-1], 3),
        "approx_callback_hz_from_median": round(1000 / median(intervals_ms), 1),
        "limitation": "Windows pointer callbacks may coalesce raw HID reports; this is an independent estimate, not a USB bus trace.",
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
