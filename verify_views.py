import os
import sys
import django

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

try:
    from backend.gestion import views
    print("SUCCESS: views.py imported correctly")
except Exception as e:
    print(f"ERROR: {e}")
