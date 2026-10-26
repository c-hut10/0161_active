"""Compatibility entry point: retro ward details now share the main map's geographic source."""
from pathlib import Path
import runpy

if __name__ == '__main__':
    runpy.run_path(str(Path(__file__).with_name('build-retro-ward-links.py')), run_name='__main__')
