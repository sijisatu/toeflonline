#!/usr/bin/env bash
# =============================================================================
# init-db.sh — Initialize the TOEFL Online PostgreSQL database
#
# Runs the schema migration and (optionally) the demo seed in order:
#   1. database/postgresql/001_initial_schema.sql
#   2. database/postgresql/002_seed_demo.sql  (skipped with --no-seed)
#
# Usage:
#   ./scripts/init-db.sh [--no-seed]
#
# Connection is configured via environment variables (preferred) or the
# DATABASE_URL variable.  Individual variables take precedence over DATABASE_URL.
#
# Environment variables:
#   DATABASE_URL          Full PostgreSQL connection string (optional)
#   PGHOST / POSTGRES_HOST  Hostname  (default: 127.0.0.1)
#   PGPORT / POSTGRES_PORT  Port      (default: 5432)
#   PGDATABASE / POSTGRES_DB  Database name  (default: toefl_online)
#   PGUSER / POSTGRES_USER    Username       (default: toefl_app)
#   PGPASSWORD / POSTGRES_PASSWORD  Password (default: change-me)
#
# Railway usage:
#   Set DATABASE_URL to ${{Postgres.DATABASE_URL}} in your service variables,
#   then run this script as a one-off command or deploy hook.
#
# Local usage (with docker-compose):
#   docker compose -f infra/docker-compose.local.yml up -d
#   ./scripts/init-db.sh
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
info()    { echo "[init-db] $*"; }
success() { echo "[init-db] ✓ $*"; }
error()   { echo "[init-db] ✗ $*" >&2; }

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
RUN_SEED=true
for arg in "$@"; do
  case "$arg" in
    --no-seed) RUN_SEED=false ;;
    --help|-h)
      sed -n '2,30p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      error "Unknown argument: $arg"
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Resolve script and repo root
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SQL_DIR="$REPO_ROOT/database/postgresql"

# ---------------------------------------------------------------------------
# Resolve connection parameters
# Priority: individual env vars > DATABASE_URL > defaults
# ---------------------------------------------------------------------------
if [[ -n "${DATABASE_URL:-}" ]]; then
  # Parse DATABASE_URL: postgres://user:pass@host:port/dbname
  # Strip the scheme
  _url="${DATABASE_URL#postgres://}"
  _url="${_url#postgresql://}"

  # user:pass@host:port/dbname
  _userinfo="${_url%%@*}"
  _hostinfo="${_url#*@}"

  _DB_USER="${_userinfo%%:*}"
  _DB_PASS="${_userinfo#*:}"

  _hostport="${_hostinfo%%/*}"
  _DB_NAME="${_hostinfo#*/}"
  # Strip query string from dbname
  _DB_NAME="${_DB_NAME%%\?*}"

  _DB_HOST="${_hostport%%:*}"
  _DB_PORT="${_hostport##*:}"
  # If no port was present the host and port will be the same string
  [[ "$_DB_HOST" == "$_DB_PORT" ]] && _DB_PORT="5432"
else
  _DB_HOST=""
  _DB_PORT=""
  _DB_NAME=""
  _DB_USER=""
  _DB_PASS=""
fi

# Individual env vars override DATABASE_URL-derived values
DB_HOST="${PGHOST:-${POSTGRES_HOST:-${_DB_HOST:-127.0.0.1}}}"
DB_PORT="${PGPORT:-${POSTGRES_PORT:-${_DB_PORT:-5432}}}"
DB_NAME="${PGDATABASE:-${POSTGRES_DB:-${_DB_NAME:-toefl_online}}}"
DB_USER="${PGUSER:-${POSTGRES_USER:-${_DB_USER:-toefl_app}}}"
DB_PASS="${PGPASSWORD:-${POSTGRES_PASSWORD:-${_DB_PASS:-change-me}}}"

export PGPASSWORD="$DB_PASS"

# ---------------------------------------------------------------------------
# Verify psql is available
# ---------------------------------------------------------------------------
if ! command -v psql &>/dev/null; then
  error "psql not found. Install the PostgreSQL client tools and try again."
  error "  macOS:  brew install libpq && brew link --force libpq"
  error "  Debian: apt-get install -y postgresql-client"
  exit 1
fi

# ---------------------------------------------------------------------------
# Verify SQL files exist
# ---------------------------------------------------------------------------
SCHEMA_FILE="$SQL_DIR/001_initial_schema.sql"
SEED_FILE="$SQL_DIR/002_seed_demo.sql"

for f in "$SCHEMA_FILE" "$SEED_FILE"; do
  if [[ ! -f "$f" ]]; then
    error "SQL file not found: $f"
    exit 1
  fi
done

# ---------------------------------------------------------------------------
# Connection test
# ---------------------------------------------------------------------------
info "Connecting to PostgreSQL at $DB_HOST:$DB_PORT/$DB_NAME as $DB_USER ..."

if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
     -c "SELECT 1" --no-psqlrc -q &>/dev/null; then
  error "Cannot connect to PostgreSQL. Check your connection parameters."
  error "  Host:     $DB_HOST"
  error "  Port:     $DB_PORT"
  error "  Database: $DB_NAME"
  error "  User:     $DB_USER"
  exit 1
fi

success "Connection OK"

# ---------------------------------------------------------------------------
# Run migrations
# ---------------------------------------------------------------------------
info "Applying schema: 001_initial_schema.sql ..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
     --no-psqlrc -v ON_ERROR_STOP=1 -f "$SCHEMA_FILE"
success "Schema applied"

if [[ "$RUN_SEED" == "true" ]]; then
  info "Applying seed data: 002_seed_demo.sql ..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
       --no-psqlrc -v ON_ERROR_STOP=1 -f "$SEED_FILE"
  success "Seed data applied"
  echo ""
  info "Demo credentials:"
  info "  Admin:       admin@demo-toefl.local       / Admin123!"
  info "  Participant: participant@demo-toefl.local  / Participant123!"
else
  info "Seed skipped (--no-seed)"
fi

echo ""
success "Database initialisation complete."
