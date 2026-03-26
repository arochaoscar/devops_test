# =============================================================================
# RDS Module
# =============================================================================
# Creates a PostgreSQL database instance in private subnets.
#
# Security:
#   - Storage encryption enabled (AES-256)
#   - Not publicly accessible — only reachable from ECS tasks via SG rules
#   - Credentials stored in Secrets Manager (see secrets module)
#
# Environment differences:
#   - test: single-AZ, skip final snapshot (faster teardown)
#   - prod: multi-AZ for high availability, final snapshot on deletion
#
# Storage autoscaling is enabled: starts at allocated_storage (20 GB)
# and grows up to max_allocated_storage (50 GB) as needed.
# =============================================================================

# Subnet group places the RDS instance in private subnets across AZs
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
