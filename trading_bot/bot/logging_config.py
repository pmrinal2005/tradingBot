"""
logging_config.py — Structured logging with file rotation and console output.

Features:
  - Rotating log file (5 MB per file, 3 backup files kept)
  - Human-readable ISO-8601 timestamps
  - Log level badges: DEBUG | INFO | WARNING | ERROR | CRITICAL
  - Console output: INFO+ only (avoids noisy DEBUG spam in terminal)
  - File output: DEBUG+ (full detail for post-analysis)
  - Thread-safe via Python's built-in logging module

Log file location: logs/trading_bot.log
"""

import logging
import logging.handlers
import os
from pathlib import Path

# ── Configuration ──────────────────────────────────────────────────────────────
LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_FILE = LOG_DIR / "trading_bot.log"

LOG_FORMAT = "[%(asctime)s] [%(levelname)-7s] %(name)s — %(message)s"
DATE_FORMAT = "%Y-%m-%dT%H:%M:%S"

MAX_BYTES = 5 * 1024 * 1024  # 5 MB per file
BACKUP_COUNT = 3              # Keep 3 rotated backups


def setup_logger(name: str = "trading_bot") -> logging.Logger:
    """
    Configure and return a named logger.

    The logger writes to:
      1. logs/trading_bot.log  (DEBUG level, rotating)
      2. sys.stdout            (INFO level, coloured prefix)

    Args:
        name: Logger name (default: "trading_bot")

    Returns:
        Configured logging.Logger instance.
    """
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger(name)

    # Avoid duplicate handlers if called multiple times (e.g., in tests)
    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG)  # Capture everything; handlers filter

    # ── Rotating file handler ──────────────────────────────────────────────
    file_handler = logging.handlers.RotatingFileHandler(
        LOG_FILE,
        maxBytes=MAX_BYTES,
        backupCount=BACKUP_COUNT,
        encoding="utf-8",
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))

    # ── Console (stdout) handler ───────────────────────────────────────────
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger


# Convenience: module-level logger for direct import
log = setup_logger()
