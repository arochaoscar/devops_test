resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${var.project}/${var.environment}/db-credentials"
  description = "Database credentials for ${var.project} ${var.environment}"

  tags = merge(var.tags, { Name = "${var.project}-db-credentials" })
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id

  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    host     = var.db_host
    port     = var.db_port
    dbname   = var.db_name
  })
}
