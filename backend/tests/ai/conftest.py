"""
Pytest configuration for AI Engine tests.
Ensures backend directory is always in sys.path.
"""

import sys
from pathlib import Path

# Add backend directory to sys.path so `app.ai...` imports work seamlessly
backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
