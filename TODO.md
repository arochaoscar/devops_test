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
- [x] Application Load Balancer (ALB)
- [x] ECR repository for container image management
- [x] Tag all resources with `name:csgtest`

## 5. Application
- [ ] Simple "Hello, World!" web app
- [ ] Dockerfile
- [ ] Build and push image to ECR

## 6. CI/CD Pipeline (GitHub Actions)
- [ ] Pipeline: `main` branch → deploy to production environment
- [ ] Pipeline: `develop` branch → deploy to testing environment
- [ ] Build & push Docker image step
- [ ] Terraform plan/apply step

## 7. Documentation
- [ ] README.md with project description and usage instructions
- [ ] Infrastructure diagram (draw.io)
- [ ] CLAUDE.md for repo guidance

## 8. Pre-Interview
- [ ] Test all infrastructure end-to-end
- [ ] Verify both environments (test and prod) work
- [ ] Ensure all documentation is in English
