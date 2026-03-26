#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

echo "=== CSGTest Local Setup ==="
echo ""

# Check Node.js is installed
if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js is not installed. Install it from https://nodejs.org/"
  exit 1
fi

# Check pnpm is installed
if ! command -v pnpm &> /dev/null; then
  echo "ERROR: pnpm is not installed. Install it with: npm install -g pnpm"
  exit 1
fi

# Check Docker is installed and running
if ! command -v docker &> /dev/null; then
  echo "ERROR: Docker is not installed. Install it from https://docs.docker.com/get-started/get-docker/"
  exit 1
fi

if ! docker info &> /dev/null 2>&1; then
  echo "ERROR: Docker daemon is not running. Start Docker and try again."
  exit 1
fi

# Install root dependencies (Husky git hooks)
echo "Installing root dependencies..."
pnpm install

# Install app dependencies and run quality checks
echo ""
echo "Installing app dependencies..."
cd app
pnpm install

echo ""
echo "Running lint..."
pnpm lint

echo ""
echo "Running tests..."
pnpm test

cd ..

echo ""
echo "Lint and tests passed."
echo ""

# Create .env from .env.example if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$ENV_EXAMPLE" ]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo "Created .env from .env.example"
    echo ""
    echo "IMPORTANT: Edit .env and fill in the required values before continuing."
    echo "  - DB_USER, DB_PASSWORD, DB_NAME (local database credentials)"
    echo "  - PUBLIC_CATCHA_KEY, PRIVATE_CAPTCHA_KEY (Google reCAPTCHA keys)"
    echo ""
    read -rp "Press Enter after editing .env to continue..."
  else
    echo "ERROR: No .env or .env.example found."
    exit 1
  fi
else
  echo "Found existing .env"
fi

# Validate required variables
echo "Validating .env..."
MISSING=()
while IFS= read -r var; do
  val=$(grep "^${var}=" "$ENV_FILE" | cut -d'=' -f2-)
  if [ -z "$val" ]; then
    MISSING+=("$var")
  fi
done <<< "DB_USER
DB_PASSWORD
DB_NAME
PUBLIC_CATCHA_KEY
PRIVATE_CAPTCHA_KEY"

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "ERROR: Missing values in .env:"
  for var in "${MISSING[@]}"; do
    echo "  - $var"
  done
  exit 1
fi

echo "All required variables set."
echo ""

# Build and start containers
echo "Building and starting containers..."
docker compose up --build -d

echo ""
echo "Waiting for database to be healthy..."
docker compose exec db sh -c 'until pg_isready -U "$POSTGRES_USER" 2>/dev/null; do sleep 1; done'
echo "Database is ready."

echo ""
echo "Waiting for Prisma migrations and app startup..."
RETRIES=0
MAX_RETRIES=60
until curl -sf http://localhost:3000 > /dev/null 2>&1; do
  RETRIES=$((RETRIES + 1))
  if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
    echo ""
    echo "ERROR: App did not become ready after ${MAX_RETRIES}s."
    echo "Check logs with: docker compose logs app"
    exit 1
  fi
  printf "."
  sleep 1
done
echo ""
echo "App is ready. Prisma migrations applied."

echo ""
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "  App:      http://localhost:3000"
echo "  Database: postgresql://localhost:5432"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f app    # View app logs"
echo "  docker compose down           # Stop all services"
echo "  docker compose down -v        # Stop and remove volumes (reset DB)"
echo "  cd app && pnpm test           # Run unit tests"
echo "  cd app && pnpm lint           # Run linter"
