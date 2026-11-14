"""Profile JSON storage for local configuration and future device sync."""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path

PROFILE_VERSION = 1
SAFE_NAME = re.compile(r"[^A-Za-z0-9 _.-]+")


@dataclass(slots=True)
class Profile:
    """A local profile. Device-specific fields are not synced until verified."""

    name: str
    polling_hz: int = 1000
    active_dpi_stage: int = 1
    dpi_stages: list[int] = field(default_factory=lambda: [1200, 2400, 3200, 4800, 6400, 12000])
    lighting: dict[str, object] = field(default_factory=lambda: {"mode": None, "color": "#00B140", "brightness": None})
    button_mappings: dict[str, dict[str, object]] = field(default_factory=dict)
    macros: list[dict[str, object]] = field(default_factory=list)
    foreground_application: str | None = None

    def validate(self) -> None:
        if not self.name.strip():
            raise ValueError("Profile name cannot be empty")
        if self.polling_hz not in (125, 250, 500, 1000):
            raise ValueError("Polling rate must be 125, 250, 500, or 1000 Hz")
        if len(self.dpi_stages) != 6 or any(not 50 <= int(value) <= 12000 for value in self.dpi_stages):
            raise ValueError("A profile must contain six DPI stages in the 50–12000 range")
        if not 1 <= self.active_dpi_stage <= 6:
            raise ValueError("Active DPI stage must be from 1 to 6")


class ProfileStore:
    """Read/write named local profile JSON files with atomic replacement."""

    def __init__(self, directory: Path) -> None:
        self.directory = directory
        self.directory.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def _filename(name: str) -> str:
        safe = SAFE_NAME.sub("", name).strip(" .")
        if not safe:
            raise ValueError("Profile name must include letters or numbers")
        return safe + ".json"

    def save(self, profile: Profile) -> Path:
        profile.validate()
        destination = self.directory / self._filename(profile.name)
        payload = {"version": PROFILE_VERSION, "profile": asdict(profile)}
        temporary = destination.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        temporary.replace(destination)
        return destination

    def load(self, name: str) -> Profile:
        path = self.directory / self._filename(name)
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("version") != PROFILE_VERSION:
            raise ValueError(f"Unsupported profile schema in {path.name}")
        profile = Profile(**data["profile"])
        profile.validate()
        return profile

    def list_profiles(self) -> list[str]:
        return sorted(path.stem for path in self.directory.glob("*.json"))

    def delete(self, name: str) -> None:
        (self.directory / self._filename(name)).unlink(missing_ok=True)

    def duplicate(self, source: str, destination: str) -> Profile:
        profile = self.load(source)
        profile.name = destination
        self.save(profile)
        return profile
