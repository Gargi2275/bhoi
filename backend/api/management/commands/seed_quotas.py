import os
from django.core.management.base import BaseCommand
from api.models import SystemQuota

class Command(BaseCommand):
    help = 'Seeds initial core System Quota metrics'

    def handle(self, *args, **options):
        quotas = [
            {'code': 'max_members', 'name': 'Maximum Active Members', 'unit': 'users'},
            {'code': 'max_family_members', 'name': 'Maximum Family Members', 'unit': 'users'},
            {'code': 'max_committee_members', 'name': 'Maximum Committee Members', 'unit': 'users'},
            {'code': 'max_communities', 'name': 'Maximum Subsidiary Communities', 'unit': 'communities'},
            {'code': 'max_storage_gb', 'name': 'Maximum Media Storage', 'unit': 'GB'}
        ]

        count = 0
        for q in quotas:
            obj, created = SystemQuota.objects.get_or_create(
                code=q['code'],
                defaults={
                    'name': q['name'],
                    'unit': q['unit']
                }
            )
            if created:
                count += 1
                self.stdout.write(self.style.SUCCESS(f"Created quota: {q['code']}"))
            else:
                self.stdout.write(f"Quota {q['code']} already exists.")

        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {count} new quotas.'))
