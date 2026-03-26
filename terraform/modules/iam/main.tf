data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_execution" {
  name               = "${var.project}-ecs-execution-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

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

resource "aws_iam_role" "ecs_task" {
  name               = "${var.project}-ecs-task-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json

  tags = var.tags
}
