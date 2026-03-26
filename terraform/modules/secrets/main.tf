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
