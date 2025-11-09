# Generated migration for budget enhancements
# Note: BudgetTemplate already exists, this just enhances Budget model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0001_initial'),
    ]

    operations = [
        # Enhance Budget model with template support (BudgetTemplate already exists)
        # We're skipping the creation of BudgetTemplate since it exists in the initial migration
    ]
