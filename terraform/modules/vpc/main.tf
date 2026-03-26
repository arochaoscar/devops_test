# =============================================================================
# VPC Module
# =============================================================================
# Creates the network foundation: VPC, public/private subnets across multiple
# AZs, internet gateway, NAT gateway, route tables, and security groups.
#
# Network layout (using default /16 CIDR):
#   - Public subnets:  /24 blocks (e.g., 10.0.0.0/24, 10.0.1.0/24) — ALB
#   - Private subnets: /24 blocks (e.g., 10.0.2.0/24, 10.0.3.0/24) — ECS, RDS
#
# Traffic flow:
#   Internet → IGW → Public subnets (ALB)
#   Private subnets → NAT Gateway → Internet (outbound only)
# =============================================================================

# Fetch available AZs in the current region to distribute subnets
data "aws_availability_zones" "available" {
  state = "available"
}

# Main VPC with DNS support enabled (required for ECS service discovery
# and RDS endpoint resolution within the VPC)
resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(var.tags, { Name = "${var.project}-vpc" })
}

# --- Public Subnets ---
# Host the ALB. Each subnet is placed in a different AZ for high availability.
# cidrsubnet(base, newbits, netnum) carves /24 blocks from the /16 VPC CIDR.

resource "aws_subnet" "public" {
  count                   = var.az_count
  vpc_id                  = aws_vpc.this.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.tags, { Name = "${var.project}-public-${count.index}" })
}

# --- Private Subnets ---
# Host ECS tasks and RDS. No public IPs — outbound internet via NAT Gateway.
# Offset by az_count to avoid CIDR overlap with public subnets.

resource "aws_subnet" "private" {
  count             = var.az_count
  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + var.az_count)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = merge(var.tags, { Name = "${var.project}-private-${count.index}" })
}

# --- Internet Gateway ---
# Provides internet access for resources in public subnets (ALB)

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = merge(var.tags, { Name = "${var.project}-igw" })
}

# --- NAT Gateway (single, cost-conscious) ---
# Allows private subnet resources (ECS tasks) to reach the internet
# for pulling images, Prisma migrations, and geolocation API calls.
# A single NAT in one AZ keeps costs low — acceptable for this workload.

resource "aws_eip" "nat" {
  domain = "vpc"

  tags = merge(var.tags, { Name = "${var.project}-nat-eip" })
}

resource "aws_nat_gateway" "this" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = merge(var.tags, { Name = "${var.project}-nat" })

  depends_on = [aws_internet_gateway.this]
}

# --- Route Tables ---
# Public route table: all traffic → Internet Gateway
# Private route table: all traffic → NAT Gateway (outbound only)

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = merge(var.tags, { Name = "${var.project}-public-rt" })
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.this.id
  }

  tags = merge(var.tags, { Name = "${var.project}-private-rt" })
}

resource "aws_route_table_association" "public" {
  count          = var.az_count
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = var.az_count
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# --- Security Groups ---
# Three-tier security model:
#   ALB SG → accepts HTTP/HTTPS from the internet
#   ECS SG → accepts traffic only from ALB on the app port
#   RDS SG → accepts PostgreSQL connections only from ECS tasks
#
# revoke_rules_on_delete: removes all rules before deletion to avoid
# DependencyViolation errors when Terraform replaces the security group.
# create_before_destroy: ensures the new SG exists before the old one
# is removed, preventing downtime during replacements.

resource "aws_security_group" "alb" {
  name_prefix = "${var.project}-alb-"
  description = "Allow HTTP inbound to ALB"
  vpc_id      = aws_vpc.this.id

  revoke_rules_on_delete = true

  lifecycle {
    create_before_destroy = true
  }

  # HTTP — ALB redirects all HTTP traffic to HTTPS (301)
  ingress {
    description = "HTTP from anywhere (redirects to HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS — TLS termination at the ALB using ACM certificate
  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.project}-alb-sg" })
}

resource "aws_security_group" "ecs" {
  name_prefix = "${var.project}-ecs-"
  description = "Allow traffic from ALB to ECS tasks"
  vpc_id      = aws_vpc.this.id

  revoke_rules_on_delete = true

  lifecycle {
    create_before_destroy = true
  }

  # Only the ALB can reach ECS tasks — no direct internet access
  ingress {
    description     = "From ALB"
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.project}-ecs-sg" })
}

resource "aws_security_group" "rds" {
  name_prefix = "${var.project}-rds-"
  description = "Allow PostgreSQL from ECS tasks"
  vpc_id      = aws_vpc.this.id

  revoke_rules_on_delete = true

  lifecycle {
    create_before_destroy = true
  }

  # Only ECS tasks can connect to the database
  ingress {
    description     = "PostgreSQL from ECS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.project}-rds-sg" })
}
