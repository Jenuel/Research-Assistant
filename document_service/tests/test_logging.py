import logging

import pytest

from app.core import logging as app_logging


@pytest.fixture(autouse=True)
def _clear_log_level(monkeypatch):
    monkeypatch.delenv("LOG_LEVEL", raising=False)


def test_defaults_to_info_when_unset():
    assert app_logging._resolve_level() == logging.INFO


def test_debug_must_be_opted_into(monkeypatch):
    monkeypatch.setenv("LOG_LEVEL", "DEBUG")
    assert app_logging._resolve_level() == logging.DEBUG


def test_level_name_is_case_and_space_insensitive(monkeypatch):
    monkeypatch.setenv("LOG_LEVEL", "  warning ")
    assert app_logging._resolve_level() == logging.WARNING


@pytest.mark.parametrize("value", ["", "verbose", "TRACE", "10"])
def test_unrecognized_values_fall_back_to_info(monkeypatch, value):
    """A typo must never silently enable DEBUG — DEBUG logs carry user IDs."""
    monkeypatch.setenv("LOG_LEVEL", value)
    assert app_logging._resolve_level() == logging.INFO


def test_get_logger_applies_level_to_logger_and_handler(monkeypatch):
    monkeypatch.setenv("LOG_LEVEL", "WARNING")
    logger = app_logging.get_logger("test.logging.applies_level")

    assert logger.level == logging.WARNING
    assert logger.handlers
    assert all(h.level == logging.WARNING for h in logger.handlers)


def test_get_logger_does_not_duplicate_handlers():
    name = "test.logging.no_duplicate_handlers"
    first = app_logging.get_logger(name)
    second = app_logging.get_logger(name)

    assert first is second
    assert len(first.handlers) == 1
