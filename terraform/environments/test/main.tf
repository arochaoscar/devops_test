terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "csgtest-terraform-state"
    key            = "test/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "csgtest-terraform-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      name = "csgtest"
    }
  }
}

locals {
  project     = "csgtest"
  environment = "test"
  common_tags = {
    name        = "csgtest"
    environment = local.environment
  }
}

# --- VPC ---

module "vpc" {
  source = "../../modules/vpc"

  project  = local.project
  vpc_cidr = var.vpc_cidr
  az_count = var.az_count
  app_port = var.app_port
  tags     = local.common_tags
}

# --- ECR ---

module "ecr" {
  source = "../../modules/ecr"

  project     = local.project
  environment = local.environment
  tags        = local.common_tags
}

# --- RDS ---

module "rds" {
  source = "../../modules/rds"

  project            = local.project
  environment        = local.environment
  private_subnet_ids = module.vpc.private_subnet_ids
  security_group_id  = module.vpc.rds_security_group_id
  instance_class     = var.rds_instance_class
  db_name            = var.db_name
  db_username        = var.db_username
  db_password        = var.db_password
  multi_az           = false
  skip_final_snapshot = true
  tags               = local.common_tags
}

# --- Secrets Manager ---

module "secrets" {
  source = "../../modules/secrets"

  project     = local.project
  environment = local.environment
  db_username = var.db_username
  db_password = var.db_password
  db_host     = module.rds.address
  db_port     = module.rds.port
  db_name     = var.db_name
  tags        = local.common_tags
}

# --- IAM ---

module "iam" {
  source = "../../modules/iam"

  project      = local.project
  environment  = local.environment
  secrets_arns = [module.secrets.db_credentials_arn]
  tags         = local.common_tags
}

# --- ALB ---

module "alb" {
  source = "../../modules/alb"

  project           = local.project
  environment       = local.environment
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  security_group_id = module.vpc.alb_security_group_id
  app_port          = var.app_port
  tags              = local.common_tags
}

# --- ECS ---

module "ecs" {
  source = "../../modules/ecs"

  project            = local.project
  environment        = local.environment
  aws_region         = var.aws_region
  container_image    = "${module.ecr.repository_url}:latest"
  cpu                = var.ecs_cpu
  memory             = var.ecs_memory
  desired_count      = var.ecs_desired_count
  app_port           = var.app_port
  private_subnet_ids = module.vpc.private_subnet_ids
  security_group_id  = module.vpc.ecs_security_group_id
  target_group_arn   = module.alb.target_group_arn
  alb_listener_arn   = module.alb.alb_arn
  execution_role_arn = module.iam.ecs_execution_role_arn
  task_role_arn      = module.iam.ecs_task_role_arn
  tags               = local.common_tags

  environment_variables = [
    { name = "NODE_ENV", value = "test" },
    { name = "PORT", value = tostring(var.app_port) },
    { name = "RECAPTCHA_SITE_KEY", value = var.recaptcha_site_key },
    { name = "RECAPTCHA_SECRET_KEY", value = var.recaptcha_secret_key }
  ]

  secret_variables = [
    { name = "DATABASE_URL", valueFrom = module.secrets.db_credentials_arn }
  ]
}
