import logging
import os
import sys

DEFAULT_LOG_LEVEL = "INFO"


def _resolve_level() -> int:
    """
    Resolve the log level from the LOG_LEVEL environment variable.

    Falls back to INFO when unset or when the value is not a known level name,
    so that a typo never silently turns on DEBUG in production. DEBUG logs in
    this service include user-identifying detail (queries, Clerk user IDs)
    and must be opted into explicitly.

    :return: Numeric logging level.
    """
    name = os.getenv("LOG_LEVEL", DEFAULT_LOG_LEVEL).strip().upper()
    level = logging.getLevelName(name)
    return level if isinstance(level, int) else logging.INFO


def get_logger(name: str) -> logging.Logger:
    """
    Create and return a logger with the given name.

    Configures a StreamHandler writing to stdout with a structured format
    that includes timestamp, level, logger name, and message. The level comes
    from the LOG_LEVEL environment variable and defaults to INFO.

    :param name: Logger name — use __name__ from the calling module.
    :return: Configured Logger instance.
    """
    logger = logging.getLogger(name)

    if logger.handlers:
        return logger

    level = _resolve_level()
    logger.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)

    logger.addHandler(handler)
    logger.propagate = False

    return logger
