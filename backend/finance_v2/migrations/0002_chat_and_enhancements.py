# Generated migration for chat interface and statement enhancements

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('finance_v2', '0001_initial'),
        ('reference', '0001_initial'),
    ]

    operations = [
        # Create ChatMessage table
        migrations.CreateModel(
            name='ChatMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('conversation_id', models.CharField(db_index=True, default='main', max_length=255)),
                ('message_type', models.CharField(
                    choices=[('user', 'User'), ('system', 'System'), ('suggestion', 'Suggestion')],
                    default='user',
                    max_length=20
                )),
                ('content', models.TextField()),
                ('metadata', models.JSONField(default=dict)),
                ('status', models.CharField(
                    choices=[('draft', 'Draft'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed')],
                    default='draft',
                    max_length=20
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='chat_messages', to=settings.AUTH_USER_MODEL)),
                ('related_transaction', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='chat_messages',
                    to='finance_v2.transaction'
                )),
                ('related_file', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='chat_messages',
                    to='finance_v2.uploadedfile'
                )),
            ],
            options={
                'db_table': 'finance_chat_messages',
                'ordering': ['-created_at'],
            },
        ),

        # Create StatementPassword table
        migrations.CreateModel(
            name='StatementPassword',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('encrypted_password', models.BinaryField()),
                ('password_hint', models.CharField(blank=True, max_length=255)),
                ('is_default', models.BooleanField(default=False)),
                ('last_used', models.DateTimeField(blank=True, null=True)),
                ('success_count', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='statement_passwords', to=settings.AUTH_USER_MODEL)),
                ('account', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='statement_passwords',
                    to='finance_v2.account'
                )),
            ],
            options={
                'db_table': 'finance_statement_passwords',
                'ordering': ['-is_default', '-success_count'],
            },
        ),

        # Enhance Transaction model
        migrations.AddField(
            model_name='transaction',
            name='expense_classification',
            field=models.CharField(
                choices=[
                    ('regular', 'Regular'),
                    ('charity', 'Charity'),
                    ('family', 'Family Support'),
                    ('reimbursable', 'Reimbursable'),
                    ('one_time', 'One-time'),
                ],
                default='regular',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='transaction',
            name='exclude_from_totals',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='transaction',
            name='chat_metadata',
            field=models.JSONField(default=dict, blank=True),
        ),

        # Enhance TransactionSplit model
        migrations.AddField(
            model_name='transactionsplit',
            name='split_method',
            field=models.CharField(
                choices=[
                    ('equal', 'Equal'),
                    ('percentage', 'Percentage'),
                    ('amount', 'Amount'),
                    ('shares', 'Shares'),
                ],
                default='equal',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='transactionsplit',
            name='split_value',
            field=models.DecimalField(decimal_places=4, default=0, max_digits=12),
        ),

        # Enhance UploadedFile model
        migrations.AddField(
            model_name='uploadedfile',
            name='is_password_protected',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='uploadedfile',
            name='raw_text',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='uploadedfile',
            name='parsed_data',
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='uploadedfile',
            name='used_password',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='unlocked_files',
                to='finance_v2.statementpassword'
            ),
        ),

        # Add indexes
        migrations.AddIndex(
            model_name='chatmessage',
            index=models.Index(fields=['user', 'conversation_id', '-created_at'], name='chat_user_conv_idx'),
        ),
        migrations.AddIndex(
            model_name='transaction',
            index=models.Index(fields=['user', 'expense_classification'], name='txn_user_class_idx'),
        ),
    ]
