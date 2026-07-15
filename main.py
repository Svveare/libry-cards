"""Bothost entrypoint — monorepo root must look like Python (no package.json)."""
from __future__ import annotations

import runpy
from pathlib import Path

BOT_MAIN = Path(__file__).resolve().parent / "bot" / "main.py"

if __name__ == "__main__":
    runpy.run_path(str(BOT_MAIN), run_name="__main__")
