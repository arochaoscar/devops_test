# PagerDuty CSG Innovation Team - DevOps Take Home Exercise

AWS containerized infrastructure using Terraform, ECS, RDS, and CI/CD pipelines.

## Architecture

A reusable Terraform setup that deploys a containerized "Hello, World!" web application on AWS ECS Fargate, backed by an RDS instance and secured with proper IAM roles, security groups, and secrets management.

### Components
- **ECS Fargate Cluster** - Runs the containerized application
- **Application Load Balancer** - Routes traffic to ECS tasks
- **RDS (PostgreSQL)** - Database instance
- **ECR** - Docker image registry
- **AWS Secrets Manager** - Secure storage for secrets
- **VPC** - Networking with public/private subnets, security groups, and ACLs

All resources are tagged with `name:csgtest`.

## Project Structure

```
.
├── app/                    # Application code
│   ├── Dockerfile
│   └── ...
├── terraform/
│   ├── modules/            # Reusable Terraform modules
│   │   ├── vpc/
│   │   ├── ecs/
│   │   ├── rds/
│   │   ├── alb/
│   │   ├── ecr/
│   │   ├── secrets/
│   │   └── iam/
│   └── environments/
│       ├── test/           # Test environment config
│       └── prod/           # Production environment config
├── .github/
│   └── workflows/          # CI/CD pipelines
├── TODO.md
└── README.md
```

## Prerequisites

- AWS CLI configured with valid credentials
- Terraform >= 1.0
- Docker
- GitHub CLI (`gh`)

### 0. AWS Service Account Setup

A dedicated IAM user `csgtest-deployer` was created with limited permissions for deploying only the resources required by this exercise.

```bash
# 1. Create IAM user tagged with name:csgtest
aws iam create-user --user-name csgtest-deployer --tags Key=name,Value=csgtest

# 2. Create IAM policy with limited permissions (ECS, ECR, RDS, VPC, ALB, Secrets Manager, IAM Roles, CloudWatch Logs, Terraform state S3/DynamoDB)
aws iam create-policy --policy-name csgtest-deployer-policy \
  --policy-document file://iam-policy.json \
  --tags Key=name,Value=csgtest

# 3. Attach policy to user
aws iam attach-user-policy --user-name csgtest-deployer \
  --policy-arn arn:aws:iam::<ACCOUNT_ID>:policy/csgtest-deployer-policy

# 4. Generate access keys
aws iam create-access-key --user-name csgtest-deployer

# 5. Configure AWS CLI profile
aws configure set aws_access_key_id <ACCESS_KEY_ID> --profile csgtest-deployer
aws configure set aws_secret_access_key <SECRET_ACCESS_KEY> --profile csgtest-deployer
aws configure set region us-east-1 --profile csgtest-deployer

# 6. Verify authentication
aws sts get-caller-identity --profile csgtest-deployer
```

### GitHub Authentication

```bash
# Login with GitHub CLI
gh auth login

# Verify active account
gh auth status
```

### 1. Repository Setup

```bash
# Initialize git repo
git init

# Create GitHub repo and link as origin
gh repo create arochaoscar/devops_test --public --source=. --remote=origin \
  --description "PagerDuty CSG Innovation Team - DevOps Take Home Exercise"
```

## Environments

| Environment | Branch    | Description          |
|-------------|-----------|----------------------|
| Test        | `develop` | Testing environment  |
| Production  | `main`    | Production environment |

## Deployment

### Manual

```bash
cd terraform/environments/test   # or prod
terraform init
terraform plan
terraform apply
```

### CI/CD (GitHub Actions)

Deployments are automated based on branch:
- Push/merge to `develop` → deploys to **test**
- Push/merge to `main` → deploys to **production**

### Required GitHub Secrets

| Secret                 | Description              |
|------------------------|--------------------------|
| `AWS_ACCESS_KEY_ID`    | AWS IAM access key       |
| `AWS_SECRET_ACCESS_KEY`| AWS IAM secret key       |
| `AWS_REGION`           | AWS region (e.g. us-east-1) |

## Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch for testing
- Feature branches merge into `develop` via pull request
