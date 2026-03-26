# Architecture

## Overview

The system deploys a containerized Next.js web application on AWS ECS Fargate, behind an Application Load Balancer with HTTPS termination. Infrastructure is provisioned with Terraform using reusable modules, and CI/CD is handled by GitHub Actions.

Two isolated environments share the same Terraform modules and differ only by variables:

| Environment | Branch    | URL                             |
| ----------- | --------- | ------------------------------- |
| Test        | `develop` | https://test.arochaoscar.online |
| Production  | `main`    | https://arochaoscar.online      |

## Infrastructure Diagram

```
                         ┌──────────────────────────────────────────────────────┐
                         │                    Route 53                         │
                         │  arochaoscar.online → ALB (prod)                    │
                         │  test.arochaoscar.online → ALB (test)               │
                         └──────────────────────┬───────────────────────────────┘
                                                │
                         ┌──────────────────────┴───────────────────────────────┐
                         │              ACM Certificate                        │
                         │  *.arochaoscar.online (DNS validated via Route 53)  │
                         └──────────────────────┬───────────────────────────────┘
                                                │
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┼ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│                         VPC (10.0.0.0/16 test │ 10.1.0.0/16 prod)            │
│                                               │                              │
│  ┌────────────────────────────────────────────┼───────────────────────────┐   │
│  │                  Public Subnets (2 AZs)    │                          │   │
│  │                                            │                          │   │
│  │            ┌───────────────────────────────┴──────────────────┐       │   │
│  │            │        Application Load Balancer                 │       │   │
│  │            │                                                  │       │   │
│  │            │  :443 HTTPS ──► forward to Target Group          │       │   │
│  │            │  :80  HTTP  ──► redirect to HTTPS (301)          │       │   │
│  │            │                                                  │       │   │
│  │            │  SG: inbound 80, 443 from 0.0.0.0/0             │       │   │
│  │            └───────────────────────────────┬──────────────────┘       │   │
│  │                                            │                          │   │
│  │            ┌───────────────────┐           │                          │   │
│  │            │    NAT Gateway    │           │                          │   │
│  │            │  (outbound only)  │           │                          │   │
│  │            └────────┬──────────┘           │                          │   │
│  └─────────────────────┼──────────────────────┼──────────────────────────┘   │
│                        │                      │                              │
│  ┌─────────────────────┼──────────────────────┼──────────────────────────┐   │
│  │                 Private Subnets (2 AZs)    │                          │   │
│  │                     │                      │                          │   │
│  │                     │     ┌────────────────┴──────────────────┐       │   │
│  │                     │     │      ECS Fargate Service          │       │   │
│  │                     │     │                                   │       │   │
│  │                     │     │  Task: Next.js app (:3000)        │       │   │
│  │                     │     │  CPU: 256  Memory: 512 MiB        │       │   │
│  │                     │     │  Desired: 1 (test) / 2 (prod)     │       │   │
│  │                     │     │                                   │       │   │
│  │                     │     │  Env: NODE_ENV, PORT, RECAPTCHA_* │       │   │
│  │                     │     │  Secrets: DATABASE_URL             │       │   │
│  │                     │     │                                   │       │   │
│  │                     │     │  SG: inbound 3000 from ALB only   │       │   │
│  │                     │     └────────────────┬──────────────────┘       │   │
│  │                     │                      │                          │   │
│  │                     │     ┌────────────────┴──────────────────┐       │   │
│  │                     │     │      RDS PostgreSQL               │       │   │
│  │                     │     │                                   │       │   │
│  │                     │     │  Engine: PostgreSQL 15             │       │   │
│  │                     │     │  Instance: db.t3.micro            │       │   │
│  │                     │     │  Storage: encrypted               │       │   │
│  │                     │     │  Multi-AZ: No (test) / Yes (prod) │       │   │
│  │                     │     │  Public: No                       │       │   │
│  │                     │     │                                   │       │   │
│  │                     │     │  SG: inbound 5432 from ECS only   │       │   │
│  │                     │     └───────────────────────────────────┘       │   │
│  └──────────────────────────────────────────────────────────────────────┘    │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         Supporting Services                                 │
│                                                                             │
│  ECR                    Secrets Manager           CloudWatch Logs            │
│  ├─ csgtest-test        ├─ csgtest/test/          ├─ /ecs/csgtest-test      │
│  └─ csgtest-prod        │  db-credentials         └─ /ecs/csgtest-prod      │
│                         └─ csgtest/prod/                                    │
│                            db-credentials                                   │
│                                                                             │
│  S3                     DynamoDB                                            │
│  └─ csgtest-terraform-  └─ csgtest-terraform-                              │
│     state (tfstate)        lock (state locking)                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Network Flow

```
User ──► Route 53 ──► ALB (:443 HTTPS) ──► ECS Fargate (:3000) ──► RDS (:5432)
                       │                         │
                       │                         ├──► Secrets Manager (DATABASE_URL)
                       │                         └──► NAT Gateway ──► Internet (outbound)
                       │
                       └── :80 HTTP ──► 301 redirect to HTTPS
```

## Security Model

### Network Isolation

Traffic flows through three security group boundaries, each allowing only the minimum required:

| Security Group | Inbound                          | Outbound      |
| -------------- | -------------------------------- | ------------- |
| ALB            | TCP 80, 443 from `0.0.0.0/0`    | All           |
| ECS            | TCP 3000 from ALB SG only        | All (via NAT) |
| RDS            | TCP 5432 from ECS SG only        | All           |

- ECS tasks and RDS run in **private subnets** with no public IPs
- Outbound internet access (for Prisma migrations, geolocation API) goes through a **NAT Gateway**
- RDS is **not publicly accessible**

### Secrets Management

```
GitHub Secrets ──► TF_VAR_* ──► Terraform ──► AWS Secrets Manager ──► ECS Task (runtime)
```

- **Database credentials** are stored in AWS Secrets Manager as a PostgreSQL connection string
- ECS tasks read `DATABASE_URL` from Secrets Manager at container startup via the execution role
- **reCAPTCHA keys** are passed as environment variables through Terraform → ECS task definition
- No secrets are baked into Docker images

### TLS

- ACM certificate covers `arochaoscar.online` and `*.arochaoscar.online`
- TLS terminates at the ALB — traffic between ALB and ECS is HTTP within the VPC
- HTTP (port 80) redirects to HTTPS (port 443) with a 301

### IAM

| Role               | Purpose                                        | Permissions                                      |
| ------------------- | ---------------------------------------------- | ------------------------------------------------ |
| ECS Execution Role  | Pull images, write logs, read secrets          | `AmazonECSTaskExecutionRolePolicy` + Secrets Manager `GetSecretValue` |
| ECS Task Role       | Application runtime permissions                | Minimal (no additional policies)                 |
| `csgtest-deployer`  | CI/CD deployment user                          | ECS, ECR, RDS, EC2, ELB, Secrets Manager, ACM, Route 53, IAM Roles, S3, DynamoDB, CloudWatch Logs |

## CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GitHub Actions                               │
│                                                                     │
│  Push to develop/main (app/ changes)                                │
│  ┌──────────────┐  ┌──────────┐  ┌────────────────────────────┐    │
│  │ lint & test  │  │  audit   │  │  build & push to ECR       │    │
│  │ (ESLint+Jest)│  │ (pnpm)   │  │  (Docker + SHA tags)       │    │
│  └──────┬───────┘  └────┬─────┘  └────────────────────────────┘    │
│         │               │           ▲                               │
│         └───────┬───────┘           │ (only on push, not PRs)      │
│                 └───────────────────┘                               │
│                                                                     │
│  Push to develop/main (terraform/ changes)                          │
│  ┌──────────────────────────┐                                      │
│  │ terraform plan           │──► PR comment with plan output       │
│  └──────────────────────────┘                                      │
│                                                                     │
│  Manual trigger                                                     │
│  ┌──────────────┐  ┌─────────────────────────┐                     │
│  │ terraform    │  │ terraform apply          │                     │
│  │ plan         │─►│ (requires approval gate) │                     │
│  └──────────────┘  └─────────────────────────┘                     │
│                                                                     │
│  Manual trigger                                                     │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │ app deploy — update ECS task definition + rolling deploy │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

### Branch → Environment Mapping

| Trigger                 | Branch    | Environment | ECR Repo       | ECS Cluster/Service |
| ----------------------- | --------- | ----------- | -------------- | ------------------- |
| Push (app changes)      | `develop` | test        | `csgtest-test` | `csgtest-test`      |
| Push (app changes)      | `main`    | prod        | `csgtest-prod` | `csgtest-prod`      |

### Deployment Safety

- **Terraform Apply** and **Terraform Destroy** require manual approval via GitHub Environment protection rules
- **Terraform Destroy** requires double confirmation: typing the environment name + reviewer approval
- Terraform plans are saved as artifacts — the apply step uses the exact plan that was reviewed
- Docker images are tagged with the full commit SHA for traceability

## Terraform Module Dependency Graph

```
                    ┌─────────┐
                    │   VPC   │
                    └────┬────┘
                         │
           ┌─────────────┼─────────────┐
           │             │             │
           ▼             ▼             ▼
      ┌─────────┐  ┌─────────┐  ┌─────────┐
      │   ALB   │  │   ECS   │  │   RDS   │
      └────┬────┘  └────┬────┘  └────┬────┘
           │             │             │
           │             │             ▼
           │             │       ┌──────────┐
           │             ├──────►│ Secrets  │
           │             │       └──────────┘
           │             │
           │             ▼
           │       ┌─────────┐   ┌─────────┐
           │       │   IAM   │   │   ECR   │
           │       └─────────┘   └─────────┘
           ▼
      ┌─────────┐  ┌─────────┐
      │   ACM   │  │   DNS   │
      └─────────┘  └─────────┘
```

## Terraform State

State is stored remotely to enable team collaboration and CI/CD:

| Resource                          | Purpose                                  |
| --------------------------------- | ---------------------------------------- |
| S3 `csgtest-terraform-state`      | Stores `.tfstate` (versioned, encrypted) |
| DynamoDB `csgtest-terraform-lock`  | Prevents concurrent state modifications |

Each environment has its own state file key (`test/terraform.tfstate`, `prod/terraform.tfstate`) within the same S3 bucket.
