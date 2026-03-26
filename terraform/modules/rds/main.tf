resource "aws_db_subnet_group" "this" {
  name       = "${var.project}-${var.environment}"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, { Name = "${var.project}-db-subnet-group" })
}

resource "aws_db_instance" "this" {
  identifier     = "${var.project}-${var.environment}"
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [var.security_group_id]

  multi_az            = var.multi_az
  publicly_accessible = false
  skip_final_snapshot = var.skip_final_snapshot

  tags = merge(var.tags, { Name = "${var.project}-rds" })
}
