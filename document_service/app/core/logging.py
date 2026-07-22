import logging
import sys


def get_logger(name: str) -> logging.Logger:
    """
    Create and return a logger with the given name.

    Configures a StreamHandler writing to stdout with a structured format
    that includes timestamp, level, logger name, and message.

    :param name: Logger name — use __name__ from the calling module.
    :return: Configured Logger instance.
    """
    logger = logging.getLogger(name)

    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.DEBUG)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)

    logger.addHandler(handler)
    logger.propagate = False

    return logger
