output "db_credentials_arn" {
  value = aws_secretsmanager_secret.db_credentials.arn
}

output "db_credentials_name" {
  value = aws_secretsmanager_secret.db_credentials.name
}
