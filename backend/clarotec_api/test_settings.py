from pathlib import Path
from .settings import *  # noqa: F403,F401

# Fix F405: BASE_DIR might be undefined if not explicitly imported
if 'BASE_DIR' not in locals():
    BASE_DIR = Path(__file__).resolve().parent.parent

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
