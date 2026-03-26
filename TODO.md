# TODO - PagerDuty CSG Innovation Team - DevOps Take Home Exercise

## 0. Prerequisites
- [x] Create IAM service user `csgtest-deployer` with limited permissions
- [x] Create and attach IAM policy `csgtest-deployer-policy` (ECS, ECR, RDS, VPC, ALB, Secrets Manager, IAM Roles, CloudWatch Logs, S3/DynamoDB for Terraform state)
- [x] Generate access keys for `csgtest-deployer`
- [x] Configure AWS CLI profile `csgtest-deployer` (region: us-east-1)
- [x] Verify AWS authentication (`aws sts get-caller-identity --profile csgtest-deployer`)
- [x] Install and authenticate GitHub CLI (`gh auth login`)
- [x] Verify GitHub authentication - account: `arochaoscar`
- [ ] Install Terraform
- [ ] Install Docker
- [ ] Configure GitHub Secrets in repo (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`)

## 1. Repository Setup
- [x] Initialize git repo
- [x] Create repo on GitHub (account: arochaoscar)
- [ ] Set up branching strategy: `main` (prod) and `develop` (test)

## 2. Terraform Infrastructure
- [ ] Define project structure with reusable modules for test/prod environments
- [ ] Terraform state backend (S3 + DynamoDB)
- [ ] VPC, subnets, security groups, ACLs
- [ ] IAM roles and policies
- [ ] ECS Cluster + Task Definition with environment variables per environment (test/prod)
- [ ] RDS instance
- [ ] Secrets management (AWS Secrets Manager or SSM Parameter Store)
- [ ] Application Load Balancer (ALB)
- [ ] ECR repository for container image management
- [ ] Tag all resources with `name:csgtest`

## 3. Application
- [ ] Simple "Hello, World!" web app
- [ ] Dockerfile
- [ ] Build and push image to ECR

## 4. CI/CD Pipeline (GitHub Actions)
- [ ] Pipeline: `main` branch → deploy to production environment
- [ ] Pipeline: `develop` branch → deploy to testing environment
- [ ] Build & push Docker image step
- [ ] Terraform plan/apply step

## 5. Documentation
- [ ] README.md with project description and usage instructions
- [ ] Infrastructure diagram (draw.io)
- [ ] CLAUDE.md for repo guidance

## 6. Pre-Interview
- [ ] Test all infrastructure end-to-end
- [ ] Verify both environments (test and prod) work
- [ ] Ensure all documentation is in English
