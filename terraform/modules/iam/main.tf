# =============================================================================
# IAM Module
# =============================================================================
# Creates two IAM roles for ECS Fargate tasks:
#
# 1. Execution Role — used by the ECS agent (not the app) to:
#    - Pull container images from ECR
#    - Push logs to CloudWatch
#    - Fetch secrets from Secrets Manager (DATABASE_URL)
#
# 2. Task Role — used by the application at runtime.
#    Currently has no additional policies (least privilege).
#    Add policies here if the app needs to call AWS services directly.
#
# Both roles trust the ecs-tasks.amazonaws.com service principal.
# =============================================================================

# Trust policy: allows the ECS service to assume these roles
data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# --- Execution Role ---
# Attached to the task definition's executionRoleArn.
# The ECS agent uses this role before the container starts.

resource "aws_iam_role" "ecs_execution" {
  name               = "${var.project}-ecs-execution-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json

  tags = var.tags
}

# AWS managed policy — grants ECR pull + CloudWatch Logs write permissions
resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Custom policy — grants read access to specific Secrets Manager secrets.
# Scoped to only the ARNs passed via var.secrets_arns (db-credentials).
resource "aws_iam_policy" "secrets_access" {
  name        = "${var.project}-secrets-access-${var.environment}"
  description = "Allow ECS tasks to read secrets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = var.secrets_arns
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "secrets_access" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = aws_iam_policy.secrets_access.arn
}

# --- Task Role ---
# Attached to the task definition's taskRoleArn.
# Used by the running container for AWS API calls (if any).
# No additional policies — the app doesn't call AWS services directly.

resource "aws_iam_role" "ecs_task" {
  name               = "${var.project}-ecs-task-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json

  tags = var.tags
}
