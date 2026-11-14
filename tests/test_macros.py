"""Macro data validation and JSON round-trip tests."""

import pytest

from services.macros import Macro, MacroEvent


def test_macro_json_round_trip(tmp_path) -> None:
    macro = Macro("Test", [MacroEvent("key", "ctrl", 10), MacroEvent("key", "c", 20)])
    path = tmp_path / "macro.json"
    macro.export_json(path)
    assert Macro.import_json(path) == macro


def test_macro_rejects_invalid_delay() -> None:
    with pytest.raises(ValueError):
        Macro("bad", [MacroEvent("key", "a", 90000)]).validate()
