variable "project" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (test, prod)"
  type        = string
}

variable "secrets_arns" {
  description = "List of Secrets Manager ARNs the ECS tasks can access"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
