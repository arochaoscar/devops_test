# PagerDuty CSG Innovation Team - DevOps Take Home Exercise

AWS containerized infrastructure using Terraform, ECS, RDS, and CI/CD pipelines.

## Architecture

A reusable Terraform setup that deploys a containerized Next.js web application on AWS ECS Fargate, backed by an RDS PostgreSQL instance and secured with proper IAM roles, security groups, and secrets management.

### Components

- **Next.js Application** - "Hello, World!" app with greeting form, Google reCAPTCHA, and visitor log
- **ECS Fargate Cluster** - Runs the containerized application
- **Application Load Balancer** - Routes traffic to ECS tasks
- **RDS (PostgreSQL)** - Stores greeting records (name, timestamp, IP)
- **ECR** - Docker image registry
- **AWS Secrets Manager** - Database credentials
- **VPC** - Networking with public/private subnets, security groups, and ACLs

All resources are tagged with `name:csgtest`.

## Project Structure

```
.
├── app/                           # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # Main page — "Hello, World!" + greeting form
│   │   │   ├── layout.tsx         # Root layout
│   │   │   ├── actions.ts         # Server Actions — getGreetings / createGreeting
│   │   │   └── __tests__/         # Unit tests for server actions
│   │   ├── components/
│   │   │   ├── greeting-form.tsx  # Client component — form, reCAPTCHA, table
│   │   │   └── __tests__/         # Unit tests for components
│   │   └── lib/
│   │       ├── db.ts              # Prisma client singleton
│   │       ├── recaptcha.ts       # Server-side reCAPTCHA verification
│   │       └── __tests__/         # Unit tests for lib utilities
│   ├── prisma/                    # Prisma schema and migrations
│   ├── jest.config.js             # Jest config (server + client projects)
│   ├── eslint.config.mjs          # ESLint (Next.js + Jest + Testing Library)
│   ├── Dockerfile                 # Multi-stage hardened build (non-root, dumb-init)
│   └── Dockerfile.dev             # Development — hot-reload with volumes
├── docker-compose.yml             # Local dev: app + PostgreSQL
├── setup.sh                       # One-command local setup (deps, lint, tests, containers)
├── .husky/
│   └── pre-push                   # Git hook: lint + tests before every push
├── terraform/
│   ├── modules/                   # Reusable Terraform modules
│   │   ├── vpc/                   # VPC, subnets, IGW, NAT, route tables, security groups
│   │   ├── iam/                   # ECS execution role, task role, secrets access policy
│   │   ├── ecr/                   # Container registry with lifecycle policy
│   │   ├── alb/                   # Application Load Balancer, target group, listener
│   │   ├── ecs/                   # Fargate cluster, task definition, service, CloudWatch logs
│   │   ├── rds/                   # PostgreSQL instance, DB subnet group
│   │   └── secrets/               # Secrets Manager (DB credentials)
│   └── environments/
│       ├── test/                  # Test environment (branch: develop)
│       └── prod/                  # Production environment (branch: main)
├── .github/
│   └── workflows/                 # CI/CD pipelines
├── TODO.md
└── README.md
```

## Prerequisites

- [Node.js 20+](https://nodejs.org/) and [pnpm](https://pnpm.io/)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) configured with valid credentials
- [Terraform >= 1.0](https://developer.hashicorp.com/terraform/install)
- [Docker](https://docs.docker.com/get-started/get-docker/)
- [GitHub CLI (`gh`)](https://cli.github.com/)

### Quick Start

```bash
# One-command setup: installs deps, runs lint + tests, starts containers
./setup.sh

# App available at http://localhost:3000
```

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

### Configure GitHub Secrets

```bash
# Set AWS credentials from the csgtest-deployer profile as repo secrets
aws configure get aws_access_key_id --profile csgtest-deployer | \
  gh secret set AWS_ACCESS_KEY_ID --repo arochaoscar/devops_test

aws configure get aws_secret_access_key --profile csgtest-deployer | \
  gh secret set AWS_SECRET_ACCESS_KEY --repo arochaoscar/devops_test

gh secret set AWS_REGION --repo arochaoscar/devops_test --body "us-east-1"

# Set Terraform state backend secrets
gh secret set TF_STATE_BUCKET --repo arochaoscar/devops_test --body "csgtest-terraform-state"
gh secret set TF_STATE_LOCK_TABLE --repo arochaoscar/devops_test --body "csgtest-terraform-lock"

# Set reCAPTCHA keys
gh secret set RECAPTCHA_SITE_KEY --repo arochaoscar/devops_test --body "<SITE_KEY>"
gh secret set RECAPTCHA_SECRET_KEY --repo arochaoscar/devops_test --body "<SECRET_KEY>"

# Verify secrets
gh secret list --repo arochaoscar/devops_test
```

### 1. Repository Setup

```bash
# Initialize git repo
git init

# Create GitHub repo and link as origin
gh repo create arochaoscar/devops_test --public --source=. --remote=origin \
  --description "PagerDuty CSG Innovation Team - DevOps Take Home Exercise"
```

### 2. Terraform State Backend (Bootstrap)

The Terraform remote state is stored in S3 with DynamoDB locking. These resources are created once before any `terraform init`.

```bash
# 1. Create S3 bucket for Terraform state
aws s3api create-bucket --bucket csgtest-terraform-state \
  --region us-east-1 --profile csgtest-deployer

# 2. Enable versioning (protects state from accidental overwrites)
aws s3api put-bucket-versioning --bucket csgtest-terraform-state \
  --versioning-configuration Status=Enabled --profile csgtest-deployer

# 3. Enable server-side encryption (AES-256)
aws s3api put-bucket-encryption --bucket csgtest-terraform-state \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}' \
  --profile csgtest-deployer

# 4. Block all public access
aws s3api put-public-access-block --bucket csgtest-terraform-state \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true \
  --profile csgtest-deployer

# 5. Tag the bucket
aws s3api put-bucket-tagging --bucket csgtest-terraform-state \
  --tagging 'TagSet=[{Key=name,Value=csgtest}]' --profile csgtest-deployer

# 6. Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name csgtest-terraform-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --tags Key=name,Value=csgtest \
  --region us-east-1 --profile csgtest-deployer

# 7. Verify resources
aws s3api get-bucket-versioning --bucket csgtest-terraform-state --profile csgtest-deployer
aws dynamodb describe-table --table-name csgtest-terraform-lock --profile csgtest-deployer \
  --query 'Table.TableStatus'
```

| Resource       | Name                      | Purpose                                              |
| -------------- | ------------------------- | ---------------------------------------------------- |
| S3 Bucket      | `csgtest-terraform-state` | Stores `.tfstate` files with versioning & encryption |
| DynamoDB Table | `csgtest-terraform-lock`  | Prevents concurrent state modifications              |

### 3. Database Passwords

Random passwords are generated and stored directly as GitHub Secrets — they never touch disk or appear in logs.

```bash
# Generate and store test DB password (hex = RDS-safe characters only)
openssl rand -hex 16 | gh secret set DB_PASSWORD_TEST --repo arochaoscar/devops_test

# Generate and store prod DB password
openssl rand -hex 16 | gh secret set DB_PASSWORD_PROD --repo arochaoscar/devops_test

# Verify
gh secret list --repo arochaoscar/devops_test
```

> **Note:** Uses `hex` encoding (not `base64`) because RDS does not allow `/`, `@`, `"`, or spaces in passwords. The passwords are piped directly into `gh secret set` so they are never stored locally. In CI/CD, they are passed to Terraform via `TF_VAR_db_password`.

### 4. Terraform Infrastructure

All infrastructure is defined as reusable Terraform modules consumed by per-environment configurations. Both environments share the same modules — differences are driven by variables.

#### Modules

| Module      | Resources Created                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------- |
| **vpc**     | VPC, 2 public + 2 private subnets, Internet Gateway, NAT Gateway, route tables, security groups (ALB, ECS, RDS) |
| **iam**     | ECS task execution role (with Secrets Manager access), ECS task role                                            |
| **ecr**     | ECR repository with scan-on-push and lifecycle policy (keeps last 10 images)                                    |
| **alb**     | Application Load Balancer, target group (IP-based), HTTP listener                                               |
| **ecs**     | ECS Fargate cluster, task definition, service, CloudWatch log group                                             |
| **rds**     | PostgreSQL instance (encrypted), DB subnet group                                                                |
| **secrets** | Secrets Manager secret with DB credentials (username, password, host, port, dbname)                             |

#### Environment Differences

| Setting             | Test                     | Prod                     |
| ------------------- | ------------------------ | ------------------------ |
| VPC CIDR            | `10.0.0.0/16`            | `10.1.0.0/16`            |
| State file key      | `test/terraform.tfstate` | `prod/terraform.tfstate` |
| RDS Multi-AZ        | No                       | Yes                      |
| ECS desired count   | 1                        | 2                        |
| Skip final snapshot | Yes                      | No                       |
| `NODE_ENV`          | `test`                   | `production`             |

#### Networking & Security

- **Public subnets** — ALB (internet-facing)
- **Private subnets** — ECS tasks and RDS (no direct internet access, outbound via NAT)
- **ALB SG** — allows inbound HTTP (port 80) from `0.0.0.0/0`
- **ECS SG** — allows inbound only from ALB on the app port (3000)
- **RDS SG** — allows inbound PostgreSQL (5432) only from ECS tasks

#### Usage

```bash
cd terraform/environments/test   # or prod

# First time: initialize with remote backend
terraform init

# Preview changes
terraform plan -var="db_password=YOUR_DB_PASSWORD"

# Apply infrastructure
terraform apply -var="db_password=YOUR_DB_PASSWORD"

# Destroy (when needed)
terraform destroy -var="db_password=YOUR_DB_PASSWORD"
```

> **Note:** `db_password` is the only required variable without a default. In CI/CD, it is passed via GitHub Secrets.

### 5. Application

A Next.js app with a greeting form, Google reCAPTCHA v2, and a visitor log stored in PostgreSQL.

#### Features

- **"Hello, World!"** landing page
- **Input** — "Leave your name to say Hello"
- **Google reCAPTCHA v2** — prevents bot submissions
- **Greetings table** — "All these people have said Hello" with name, date/time, location, and IP
- **Server Actions** — `getGreetings()` (list) and `createGreeting()` (create with validation, IP geolocation)

#### How Secrets Flow

```
GitHub Secrets ──► Terraform (TF_VAR_*) ──► ECS Environment Variables ──► App Runtime
```

- `RECAPTCHA_SITE_KEY` — read server-side, passed to client as prop (no `NEXT_PUBLIC_` — nothing baked in the image)
- `RECAPTCHA_SECRET_KEY` — server-side only, used to verify captcha with Google
- `DATABASE_URL` — injected from AWS Secrets Manager as JSON, parsed at runtime

#### Docker Hardening

The production image includes:

- **Non-root user** (`nextjs:nodejs`, UID 1001)
- **dumb-init** as PID 1 for proper signal handling
- **Alpine packages upgraded** at build time
- **Standalone output** — minimal image, no `node_modules`
- **Read-only filesystem** support (only `.next/cache` writable)

#### Testing

Unit tests use Jest with ts-jest, split into two projects (server in Node, client in jsdom):

```bash
cd app

# Run all tests (37 tests across 3 suites)
pnpm test

# Watch mode
pnpm test:watch

# Run lint (ESLint with Jest + Testing Library plugins)
pnpm lint
```

| Suite | Scope |
|-------|-------|
| `recaptcha.test.ts` | Bypass logic, success/failure responses |
| `actions.test.ts` | Input validation, reCAPTCHA, IP extraction, local IP detection, geolocation |
| `greeting-form.test.tsx` | Render, form submission, error handling, captcha gating, avatar rendering |

#### Git Hooks (Husky)

A `pre-push` hook runs `pnpm lint && pnpm test` before every push. If either fails, the push is blocked.

#### Local Development

```bash
# One-command setup (recommended)
./setup.sh

# Or manually:
docker compose up --build
# Access at http://localhost:3000
```

The `docker-compose.yml` provides:

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `app` | Built from `./app` (Dockerfile.dev) | 3000 | Next.js dev server with hot-reload |
| `db` | `postgres:15-alpine` | 5432 | PostgreSQL database |

Prisma migrations run automatically on container startup. Environment variables (`RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`, `DATABASE_URL`) are passed as runtime env vars — the Docker image contains no secrets.

## Environments

| Environment | Branch    | Description            |
| ----------- | --------- | ---------------------- |
| Test        | `develop` | Testing environment    |
| Production  | `main`    | Production environment |

## Deployment

### Manual

```bash
cd terraform/environments/test   # or prod
terraform init
terraform plan -var="db_password=YOUR_DB_PASSWORD"
terraform apply -var="db_password=YOUR_DB_PASSWORD"
```

### CI/CD (GitHub Actions)

#### `app-ci.yml` — Automatic

Triggers on push/PR to `develop` or `main` when `app/` files change. Runs three jobs:

| Job | Runs | Description |
|-----|------|-------------|
| **lint-and-test** | Always | ESLint + Jest (37 unit tests) |
| **audit** | Always | `pnpm audit --prod` — checks for known vulnerabilities |
| **build-and-push** | Push only (not PRs) | Docker build with layer caching, push to ECR |

Branch mapping: `develop` → `csgtest-test`, `main` → `csgtest-prod`. Images are tagged with full SHA, short SHA, and `latest`. Docker layer caching via GitHub Actions cache (BuildKit) reduces build time by ~50-70% on subsequent runs.

Two additional workflows handle infrastructure deployment with a **plan-auto / apply-manual** strategy:

#### `terraform-plan.yml` — Automatic

Triggers automatically on:

- **Push** to `develop` or `main` (when `terraform/` files change)
- **Pull requests** targeting `develop` or `main`

| Step                 | Description                                         |
| -------------------- | --------------------------------------------------- |
| `terraform init`     | Initializes backend and downloads providers         |
| `terraform validate` | Checks syntax and configuration                     |
| `terraform plan`     | Generates execution plan and saves as artifact      |
| PR comment           | Posts the plan output as a comment on pull requests |

Only the matching environment runs (push to `develop` → plan for test, push to `main` → plan for prod).

#### `terraform-apply.yml` — Manual

Triggered manually from **Actions → Terraform Apply → Run workflow** in the GitHub portal.

| Step               | Description                                                      |
| ------------------ | ---------------------------------------------------------------- |
| Select environment | Choose `test` or `prod` from the dropdown                        |
| Plan               | Runs a fresh plan and saves as artifact                          |
| **Approval**       | Requires manual approval via GitHub Environment protection rules |
| Apply              | Applies the saved plan                                           |

#### GitHub Environments

Both environments are configured with protection rules:

| Environment | Required Reviewer | Deployment Branch |
| ----------- | ----------------- | ----------------- |
| `test`      | `arochaoscar`     | `develop`         |
| `prod`      | `arochaoscar`     | `main`            |

When the apply or destroy workflow runs, GitHub will pause at the final job and show a **"Review deployments"** button. The required reviewer must approve before Terraform executes.

#### `terraform-destroy.yml` — Manual

Triggered manually from **Actions → Terraform Destroy → Run workflow** in the GitHub portal.

| Step | Description |
|------|-------------|
| Select environment | Choose `test` or `prod` from the dropdown |
| Confirm | Type the environment name to confirm (must match selection) |
| Plan destroy | Runs `terraform plan -destroy` and saves as artifact |
| **Approval** | Requires manual approval via GitHub Environment protection rules |
| Destroy | Applies the destroy plan |

> **Safety:** Requires double confirmation — typing the environment name AND reviewer approval.

#### Workflow Files

```
.github/workflows/
├── app-ci.yml              # Auto: lint, test, audit, Docker build & push to ECR
├── app-deploy.yml          # Manual: build Docker image, push to ECR, deploy to ECS
├── terraform-plan.yml      # Auto: plan on push/PR
├── terraform-apply.yml     # Manual: apply via workflow_dispatch
└── terraform-destroy.yml   # Manual: destroy via workflow_dispatch
```

### Required GitHub Secrets

| Secret                  | Description                       |
| ----------------------- | --------------------------------- |
| `AWS_ACCESS_KEY_ID`     | AWS IAM access key                |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key                |
| `AWS_REGION`            | AWS region (us-east-1)            |
| `TF_STATE_BUCKET`       | S3 bucket for Terraform state     |
| `TF_STATE_LOCK_TABLE`   | DynamoDB table for state locking  |
| `DB_PASSWORD_TEST`      | RDS password for test environment |
| `DB_PASSWORD_PROD`      | RDS password for prod environment |
| `RECAPTCHA_SITE_KEY`    | Google reCAPTCHA v2 site key (public) |
| `RECAPTCHA_SECRET_KEY`  | Google reCAPTCHA v2 secret key |

## Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch for testing
- Feature branches merge into `develop` via pull request
