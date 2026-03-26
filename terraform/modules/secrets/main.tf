# =============================================================================
# Secrets Module
# =============================================================================
# Stores database credentials in AWS Secrets Manager as a PostgreSQL
# connection string (DATABASE_URL format).
#
# The secret is referenced by the ECS task definition as a "secret" env var.
# At container startup, the ECS agent fetches the value from Secrets Manager
# and injects it as the DATABASE_URL environment variable.
#
# Connection string format:
#   postgresql://username:password@host:port/dbname
#
# This avoids JSON parsing at runtime — Prisma reads DATABASE_URL directly.
# =============================================================================

resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${var.project}/${var.environment}/db-credentials"
  description = "Database credentials for ${var.project} ${var.environment}"

  tags = merge(var.tags, { Name = "${var.project}-db-credentials" })
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id

  # Store as a PostgreSQL connection string so ECS can inject it
  # directly as DATABASE_URL without parsing JSON at runtime
  secret_string = "postgresql://${var.db_username}:${var.db_password}@${var.db_host}:${var.db_port}/${var.db_name}"
}
