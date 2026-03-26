# TODO - PagerDuty CSG Innovation Team - DevOps Take Home Exercise

## 0. Prerequisites
- [x] Create IAM service user `csgtest-deployer` with limited permissions
- [x] Create and attach IAM policy `csgtest-deployer-policy` (ECS, ECR, RDS, VPC, ALB, Secrets Manager, IAM Roles, CloudWatch Logs, S3/DynamoDB for Terraform state)
- [x] Generate access keys for `csgtest-deployer`
- [x] Configure AWS CLI profile `csgtest-deployer` (region: us-east-1)
- [x] Verify AWS authentication (`aws sts get-caller-identity --profile csgtest-deployer`)
- [x] Install and authenticate GitHub CLI (`gh auth login`)
- [x] Verify GitHub authentication - account: `arochaoscar`
- [x] Install Terraform (v1.5.7)
- [ ] Install Docker
- [x] Configure GitHub Secrets in repo (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`)

## 1. Repository Setup
- [x] Initialize git repo
- [x] Create repo on GitHub (account: arochaoscar)
- [x] Set up branching strategy: `main` (prod) and `develop` (test)

## 2. Terraform State Backend (Bootstrap)
- [x] Create S3 bucket `csgtest-terraform-state` with versioning enabled
- [x] Enable server-side encryption (AES-256) on S3 bucket
- [x] Block all public access on S3 bucket
- [x] Create DynamoDB table `csgtest-terraform-lock` (partition key: `LockID`)
- [x] Tag all resources with `name:csgtest`
- [x] Verify state backend works

## 3. Database Passwords
- [x] Generate random password for test DB and store as GitHub Secret `DB_PASSWORD_TEST`
- [x] Generate random password for prod DB and store as GitHub Secret `DB_PASSWORD_PROD`
- [x] Verify secrets exist (`gh secret list`)

## 4. Terraform Infrastructure
- [x] Define project structure with reusable modules for test/prod environments
- [x] VPC, subnets, security groups, ACLs
- [x] IAM roles and policies
- [x] ECS Cluster + Task Definition with environment variables per environment (test/prod)
- [x] RDS instance
- [x] Secrets management (AWS Secrets Manager)
- [x] Application Load Balancer (ALB) with HTTPS listener and HTTP→HTTPS redirect
- [x] ECR repository for container image management
- [x] ACM certificate with wildcard SAN and DNS validation via Route 53
- [x] Route 53 DNS records (A alias to ALB) — `test.arochaoscar.online` and `arochaoscar.online`
- [x] Route 53 zone ID passed as variable from GitHub Secret `ROUTE53_ZONE_ID`
- [x] Tag all resources with `name:csgtest`

## 5. Application
- [x] Simple "Hello, World!" web app (Next.js with greeting form, reCAPTCHA, visitor log)
- [x] Dockerfile (multi-stage, hardened, non-root, dumb-init)
- [x] Build and push image to ECR
- [x] Unit tests (37 tests across 3 suites — Jest with ts-jest)
- [x] ESLint with Jest + Testing Library plugins

## 6. CI/CD Pipeline (GitHub Actions)
- [x] Pipeline: `main` branch → deploy to production environment
- [x] Pipeline: `develop` branch → deploy to testing environment
- [x] Build & push Docker image step (`app-ci.yml` — lint, test, audit, Docker build)
- [x] Terraform plan/apply step (`terraform-plan.yml` auto, `terraform-apply.yml` manual)
- [x] Terraform destroy workflow with double confirmation (`terraform-destroy.yml`)
- [x] App deploy workflow — ECS task definition update (`app-deploy.yml`)
- [x] GitHub Environment protection rules with required reviewers

## 7. Documentation
- [x] README.md with project description and usage instructions
- [ ] Infrastructure diagram (draw.io)
- [x] CLAUDE.md for repo guidance

## 8. Pre-Interview
- [ ] Test all infrastructure end-to-end
- [ ] Verify test environment works (`test.arochaoscar.online`)
- [ ] Verify prod environment works (`arochaoscar.online`)
- [ ] Ensure all documentation is in English
