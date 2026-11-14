"""Macro JSON data model and validation; execution is intentionally separate."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class MacroEvent:
    """One key or mouse action plus its delay from the previous event."""

    kind: str
    action: str
    delay_ms: int = 0

    def validate(self) -> None:
        if self.kind not in {"key", "mouse"}:
            raise ValueError("Macro event kind must be 'key' or 'mouse'")
        if not self.action.strip():
            raise ValueError("Macro action cannot be empty")
        if not 0 <= self.delay_ms <= 60000:
            raise ValueError("Macro delay must be between 0 and 60000 ms")


@dataclass(slots=True)
class Macro:
    """Validated, portable sequence of input events."""

    name: str
    events: list[MacroEvent]
    loop_count: int = 1

    def validate(self) -> None:
        if not self.name.strip():
            raise ValueError("Macro name cannot be empty")
        if not 1 <= self.loop_count <= 100:
            raise ValueError("Loop count must be between 1 and 100")
        for event in self.events:
            event.validate()

    def export_json(self, path: Path) -> None:
        self.validate()
        path.write_text(json.dumps(asdict(self), indent=2) + "\n", encoding="utf-8")

    @classmethod
    def import_json(cls, path: Path) -> Macro:
        raw = json.loads(path.read_text(encoding="utf-8"))
        macro = cls(raw["name"], [MacroEvent(**event) for event in raw["events"]], raw.get("loop_count", 1))
        macro.validate()
        return macro
