# Automated Database Migrations

## Overview

This project now has automated database migrations that run on Docker container startup.

## How It Works

1. **Migrations folder**: `migrations/` contains numbered SQL files (e.g., `001_add_gotify_tokens.sql`)
2. **Entrypoint script**: `docker-entrypoint.sh` runs all migrations before starting the app
3. **Automatic execution**: When you run `docker-compose up -d --build`, migrations run automatically

## Usage

### Adding a New Migration

1. Create a new SQL file in the `migrations` folder with a sequential number:
   ```
   migrations/
   ├── 001_add_gotify_tokens.sql
   ├── 002_your_new_migration.sql
   └── 003_another_migration.sql
   ```

2. Write your SQL migration:
   ```sql
   -- migrations/002_add_new_field.sql
   ALTER TABLE users ADD COLUMN new_field VARCHAR(255);
   ```

3. Rebuild and restart:
   ```bash
   docker-compose up -d --build
   ```

The migration will run automatically on startup!

## Migration Behavior

- **Idempotent**: Migrations should be written to be idempotent (can run multiple times safely)
- **Use IF NOT EXISTS**: Always use `IF NOT EXISTS` or similar checks
- **Error handling**: If a migration fails, it logs a warning but continues to the next

Example idempotent migration:
```sql
-- Good - safe to run multiple times
ALTER TABLE users ADD COLUMN IF NOT EXISTS gotify_client_token VARCHAR(255);

-- Bad - will fail on second run
ALTER TABLE users ADD COLUMN gotify_client_token VARCHAR(255);
```

## Testing Locally

To test migrations without Docker:
```bash
psql -U vcomm_user -d vcomm_db -f migrations/001_add_gotify_tokens.sql
```

## Troubleshooting

### Migration not running
1. Check logs: `docker logs vcomm-messenger`
2. Verify migration file is in `migrations/` folder
3. Ensure `docker-entrypoint.sh` has execute permissions

### PostgreSQL connection errors
The entrypoint script waits for PostgreSQL to be ready before running migrations. If it still fails:
1. Check PostgreSQL is running: `docker ps | grep postgres`
2. Verify DATABASE_URL in docker-compose.yml
3. Check credentials match between app and database

## Files

- `docker-entrypoint.sh` - Startup script that runs migrations
- `migrations/` - SQL migration files
- `dockerfile` - Updated to use entrypoint and install PostgreSQL client
