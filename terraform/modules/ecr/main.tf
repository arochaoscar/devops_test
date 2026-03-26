# =============================================================================
# ECR Module
# =============================================================================
# Creates a container image registry for the application.
#
# One repository per environment (csgtest-test, csgtest-prod).
# Images are pushed by the app-ci.yml workflow with three tags:
#   - Full commit SHA (40 chars) — for traceability
#   - Short SHA (7 chars) — for human readability
#   - "latest" — for the ECS task definition default
#
# scan_on_push: automatically scans images for OS vulnerabilities
# when pushed — results visible in the ECR console.
#
# Lifecycle policy: keeps the 10 most recent images and expires older
# ones to avoid unbounded storage growth.
# =============================================================================

resource "aws_ecr_repository" "this" {
  name                 = "${var.project}-${var.environment}"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(var.tags, { Name = "${var.project}-ecr" })
}

# Automatically expire old images — keeps storage costs predictable
resource "aws_ecr_lifecycle_policy" "this" {
  repository = aws_ecr_repository.this.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
