# =============================================================================
# ECS Module
# =============================================================================
# Creates the ECS Fargate cluster, task definition, and service.
#
# The task runs the Next.js application container in private subnets,
# registered with the ALB target group for load-balanced HTTPS traffic.
#
# Container configuration:
#   - Image pulled from ECR (tagged by commit SHA in CI)
#   - Environment variables: NODE_ENV, PORT, RECAPTCHA_*
#   - Secrets: DATABASE_URL injected from Secrets Manager at startup
#   - Logs shipped to CloudWatch via awslogs driver
#
# The service performs rolling deployments: new tasks start before old
# ones are drained, ensuring zero-downtime updates.
# =============================================================================

# CloudWatch log group for container stdout/stderr
resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${var.project}-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_ecs_cluster" "this" {
  name = "${var.project}-${var.environment}"

  tags = merge(var.tags, { Name = "${var.project}-cluster" })
}

# Fargate task definition — defines the container spec, resource limits,
# and IAM roles. Uses awsvpc networking so each task gets its own ENI.
#
# Roles:
#   - execution_role: used by ECS agent to pull images, push logs,
#     and fetch secrets from Secrets Manager
#   - task_role: used by the application at runtime (minimal permissions)
resource "aws_ecs_task_definition" "this" {
  family                   = "${var.project}-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name      = "${var.project}-app"
      image     = var.container_image
      essential = true

      portMappings = [
        {
          containerPort = var.app_port
          protocol      = "tcp"
        }
      ]

      # Plain-text env vars passed through Terraform
      environment = var.environment_variables

      # Secrets injected from AWS Secrets Manager at container startup.
      # ECS agent fetches the secret value and sets it as an env var.
      secrets = var.secret_variables

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.this.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = var.tags
}

# ECS service — maintains the desired number of running tasks and
# registers them with the ALB target group.
# Tasks run in private subnets with no public IP (outbound via NAT).
# depends_on ensures the ALB listener exists before tasks start,
# preventing registration failures during initial deployment.
resource "aws_ecs_service" "this" {
  name            = "${var.project}-${var.environment}"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "${var.project}-app"
    container_port   = var.app_port
  }

  depends_on = [var.alb_listener_arn]

  tags = var.tags
}
