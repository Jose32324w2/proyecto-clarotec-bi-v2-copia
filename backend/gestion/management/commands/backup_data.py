import os
import json
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.conf import settings

class Command(BaseCommand):
    help = 'Generates a full database backup safely handling encoding (UTF-8)'

    def handle(self, *args, **options):
        # Define output path
        output_file = os.path.join(settings.BASE_DIR, 'gestion', 'data', 'backup_final_aws.json')
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(output_file), exist_ok=True)

        self.stdout.write(f"⏳ Starting backup to: {output_file}")

        try:
            # Open file with explicit UTF-8 encoding
            with open(output_file, 'w', encoding='utf-8') as f:
                # Call dumpdata directly to stdout, but we intercept it? 
                # Actually, call_command returns the output as string if stdout is not provided? 
                # No, call_command writes to stdout. 
                # Better approach: Use call_command with stdout argument pointing to our file object?
                # call_command('dumpdata', ..., stdout=f) works in Django.
                
                call_command(
                    'dumpdata',
                    exclude=['auth.permission', 'contenttypes', 'sessions.session', 'admin.logentry'],
                    indent=2,
                    stdout=f
                )
            
            self.stdout.write(self.style.SUCCESS(f"✅ Backup successfully created at: {output_file}"))
            self.stdout.write(self.style.SUCCESS(f"file size: {os.path.getsize(output_file) / 1024:.2f} KB"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Backup failed: {str(e)}"))
