# =============================================================================
# ALB Module
# =============================================================================
# Creates an internet-facing Application Load Balancer with:
#   - HTTPS listener (port 443) — terminates TLS, forwards to ECS targets
#   - HTTP listener (port 80)   — redirects to HTTPS (301)
#   - IP-based target group     — required for Fargate awsvpc networking
#
# TLS is terminated at the ALB using the ACM certificate. Traffic between
# the ALB and ECS tasks flows as plain HTTP within the private VPC.
# =============================================================================

# Internet-facing ALB deployed across public subnets for high availability
resource "aws_lb" "this" {
  name               = "${var.project}-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.security_group_id]
  subnets            = var.public_subnet_ids

  tags = merge(var.tags, { Name = "${var.project}-alb" })
}

# Target group for ECS Fargate tasks.
# target_type = "ip" is required because Fargate uses awsvpc networking
# where each task gets its own ENI and private IP address.
resource "aws_lb_target_group" "this" {
  name        = "${var.project}-tg-${var.environment}"
  port        = var.app_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = var.health_check_path
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = merge(var.tags, { Name = "${var.project}-tg" })
}

# HTTPS listener — terminates TLS at the ALB using the ACM certificate,
# then forwards plain HTTP to ECS tasks on the app port.
# Uses TLS 1.3 security policy for strong encryption.
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }

  tags = var.tags
}

# HTTP listener — permanent redirect (301) to HTTPS.
# Ensures all traffic is encrypted, even if users access via http://
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = var.tags
}
