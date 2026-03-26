variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones"
  type        = number
  default     = 2
}

variable "app_port" {
  description = "Application port"
  type        = number
  default     = 3000
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "csgtest"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "csgtest"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "ecs_cpu" {
  description = "ECS task CPU"
  type        = string
  default     = "256"
}

variable "ecs_memory" {
  description = "ECS task memory"
  type        = string
  default     = "512"
}

variable "ecs_desired_count" {
  description = "ECS desired task count"
  type        = number
  default     = 1
}
