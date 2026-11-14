"""Profile serialization tests."""

import pytest

from services.profiles import Profile, ProfileStore


def test_profile_round_trip_and_duplicate(tmp_path) -> None:
    store = ProfileStore(tmp_path / "profiles")
    profile = Profile("FPS", polling_hz=500, active_dpi_stage=2, dpi_stages=[800, 1600, 2400, 3200, 6400, 12000])
    store.save(profile)
    assert store.load("FPS") == profile
    assert store.duplicate("FPS", "FPS Copy").name == "FPS Copy"
    assert store.list_profiles() == ["FPS", "FPS Copy"]


def test_profile_rejects_invalid_poll_rate() -> None:
    with pytest.raises(ValueError):
        Profile("bad", polling_hz=333).validate()


def test_profile_rejects_invalid_dpi_table() -> None:
    with pytest.raises(ValueError):
        Profile("bad", dpi_stages=[800]).validate()
