#!/bin/sh
# Docker Startup Script - Runs migrations before starting app

echo "🔧 Running database migrations..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until PGPASSWORD=vcomm_password psql -h postgres -U vcomm_user -d vcomm_db -c '\q' 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "✅ PostgreSQL is ready!"

# Run all migrations in the migrations folder
MIGRATIONS_DIR="/app/migrations"

if [ -d "$MIGRATIONS_DIR" ]; then
  echo "📁 Found migrations directory"
  
  for migration in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$migration" ]; then
      echo "▶️  Running migration: $(basename $migration)"
      PGPASSWORD=vcomm_password psql -h postgres -U vcomm_user -d vcomm_db -f "$migration"
      
      if [ $? -eq 0 ]; then
        echo "   ✅ Success"
      else
        echo "   ⚠️  Migration may have already been applied or failed"
      fi
    fi
  done
  
  echo "✅ All migrations processed"
else
  echo "ℹ️  No migrations directory found, skipping..."
fi

echo "🚀 Starting application..."
exec npm start
