# Generated migration for AI provider and UI enhancements

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        # Enhance AISettings
        migrations.AddField(
            model_name='aisettings',
            name='gemini_api_key',
            field=models.TextField(blank=True),  # Encrypted, use TextField like other keys
        ),
        migrations.AddField(
            model_name='aisettings',
            name='gemini_model',
            field=models.CharField(default='gemini-pro', max_length=50, blank=True),
        ),

        # Enhance UserPreferences
        migrations.AddField(
            model_name='userpreferences',
            name='sidebar_collapsed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='userpreferences',
            name='chat_mode',
            field=models.CharField(
                choices=[
                    ('normal', 'Normal'),
                    ('ai', 'AI'),
                    ('shortcut', 'Shortcut'),
                ],
                default='ai',
                max_length=20
            ),
        ),
    ]
