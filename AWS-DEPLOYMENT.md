# DocClinic ERP - AWS Deployment Guide

## Overview

This guide covers deploying DocClinic ERP to AWS using **Free Tier** resources with **HIPAA-compliant** security configurations.

### AWS Free Tier Resources Used

| Service | Free Tier Allocation | Our Usage |
|---------|---------------------|-----------|
| EC2 | 750 hrs/month t2.micro | 1 instance (24/7) |
| RDS | 750 hrs/month db.t3.micro | 1 PostgreSQL instance |
| S3 | 5GB storage | File uploads & backups |
| CloudWatch | 10 custom metrics, 5GB logs | Monitoring & logging |
| Secrets Manager | 30 days free trial, then $0.40/secret/month | 3 secrets |
| SNS | 1M publishes | Alerts |

**Estimated Monthly Cost (after free tier):** ~$5-15/month

---

## Prerequisites

1. **AWS Account** with Free Tier eligibility
2. **AWS CLI** installed and configured
3. **Git** installed
4. **Domain name** (optional, but recommended for SSL)

---

## Deployment Steps

### Step 1: Create AWS Key Pair

```bash
# Create EC2 key pair
aws ec2 create-key-pair \
    --key-name docclinic-key-production \
    --query 'KeyMaterial' \
    --output text > ~/.ssh/docclinic-key.pem

chmod 600 ~/.ssh/docclinic-key.pem
```

### Step 2: Deploy CloudFormation Stack

```bash
# Navigate to project
cd docclinic-erp

# Deploy infrastructure
aws cloudformation create-stack \
    --stack-name docclinic-production \
    --template-body file://aws/cloudformation-secure.yml \
    --capabilities CAPABILITY_NAMED_IAM \
    --parameters \
        ParameterKey=Environment,ParameterValue=production \
        ParameterKey=KeyPairName,ParameterValue=docclinic-key-production \
        ParameterKey=SSHAllowedIP,ParameterValue=YOUR_IP/32 \
        ParameterKey=DBUsername,ParameterValue=docclinic \
        ParameterKey=DBPassword,ParameterValue=YOUR_SECURE_DB_PASSWORD

# Wait for completion (10-15 minutes)
aws cloudformation wait stack-create-complete --stack-name docclinic-production

# Get outputs
aws cloudformation describe-stacks \
    --stack-name docclinic-production \
    --query 'Stacks[0].Outputs' \
    --output table
```

### Step 3: Set Up AWS Secrets

```bash
# Run the secrets setup script
chmod +x scripts/setup-aws-secrets.sh
./scripts/setup-aws-secrets.sh
```

When prompted, enter:
- RDS endpoint (from CloudFormation outputs)
- Database password (same as used in CloudFormation)
- Domain name (if you have one)

### Step 4: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key |

**To create an IAM user for CI/CD:**

```bash
# Create IAM user
aws iam create-user --user-name docclinic-cicd

# Attach policies
aws iam attach-user-policy \
    --user-name docclinic-cicd \
    --policy-arn arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess

aws iam attach-user-policy \
    --user-name docclinic-cicd \
    --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite

# Create access key
aws iam create-access-key --user-name docclinic-cicd
```

### Step 5: Initial EC2 Setup

```bash
# Get EC2 IP
EC2_IP=$(aws cloudformation describe-stacks \
    --stack-name docclinic-production \
    --query 'Stacks[0].Outputs[?OutputKey==`PublicIP`].OutputValue' \
    --output text)

echo "EC2 IP: $EC2_IP"

# SSH to EC2
ssh -i ~/.ssh/docclinic-key.pem ec2-user@$EC2_IP

# On EC2: Run setup script
cd /app
git clone https://github.com/YOUR_USERNAME/docclinic-erp.git current
cd current
chmod +x scripts/setup-ec2.sh
./scripts/setup-ec2.sh
```

### Step 6: Set Up SSL Certificate (Free)

**Option A: With Custom Domain**

```bash
# On EC2
# Point your domain's DNS A record to EC2_IP first

sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

**Option B: Without Domain (Self-Signed)**

```bash
# Generate self-signed certificate (for testing only)
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key \
    -out /etc/nginx/ssl/nginx.crt \
    -subj "/CN=$EC2_IP"
```

### Step 7: Configure Nginx

```bash
# On EC2
# Copy Nginx config
sudo cp /app/current/aws/nginx/docclinic.conf /etc/nginx/conf.d/

# Edit config to match your domain
sudo nano /etc/nginx/conf.d/docclinic.conf
# Replace YOUR_DOMAIN with your actual domain

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 8: Deploy Application

```bash
# From your local machine
git add .
git commit -m "Initial production deployment"
git push origin main

# GitHub Actions will automatically:
# 1. Run security scans
# 2. Run tests
# 3. Build application
# 4. Deploy to EC2
```

---

## Manual Deployment (Without CI/CD)

```bash
# On EC2
cd /app/current

# Pull latest code
git pull origin main

# Pull environment variables
aws secretsmanager get-secret-value \
    --secret-id docclinic/production/env \
    --query SecretString \
    --output text > .env

# Build and start
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# Run migrations
docker-compose -f docker-compose.production.yml exec api npx prisma migrate deploy

# Check health
curl http://localhost:3001/api/health
```

---

## Security Checklist

### Before Going Live

- [ ] Change all default passwords
- [ ] SSH key pair is secure (not shared)
- [ ] SSHAllowedIP is restricted to your IP
- [ ] Database is not publicly accessible
- [ ] SSL certificate is installed
- [ ] HIPAA_ENCRYPTION_KEY is set (64 hex chars)
- [ ] JWT_SECRET is unique and strong
- [ ] Security groups only allow necessary ports
- [ ] CloudWatch alarms are configured
- [ ] Backup retention is enabled on RDS
- [ ] S3 bucket is private

### Security Group Rules

| Port | Source | Purpose |
|------|--------|---------|
| 22 | Your IP only | SSH access |
| 80 | 0.0.0.0/0 | HTTP (redirects to HTTPS) |
| 443 | 0.0.0.0/0 | HTTPS access |

### IAM Permissions (Least Privilege)

The EC2 instance role only has:
- Secrets Manager: Read secrets in `docclinic/*`
- S3: Access to DocClinic bucket only
- CloudWatch: Write logs

---

## Monitoring

### View Logs

```bash
# Application logs
docker-compose -f docker-compose.production.yml logs -f

# Nginx logs
sudo tail -f /var/log/nginx/docclinic_access.log
sudo tail -f /var/log/nginx/docclinic_error.log

# CloudWatch (from AWS Console)
# Go to CloudWatch → Log groups → /docclinic/production
```

### Health Checks

```bash
# API health
curl https://your-domain.com/api/health

# Nginx health
curl https://your-domain.com/health
```

### CloudWatch Alarms

Pre-configured alarms:
- CPU > 80% for 10 minutes
- Memory > 85%
- Disk > 80%

To receive alerts, subscribe to SNS topic:
```bash
aws sns subscribe \
    --topic-arn arn:aws:sns:ap-south-1:ACCOUNT_ID:docclinic-alerts-production \
    --protocol email \
    --notification-endpoint your-email@example.com
```

---

## Backup & Recovery

### Database Backups

RDS automatically creates daily backups (7-day retention).

**Manual backup:**
```bash
aws rds create-db-snapshot \
    --db-instance-identifier docclinic-db-production \
    --db-snapshot-identifier docclinic-manual-backup-$(date +%Y%m%d)
```

**Restore from backup:**
```bash
aws rds restore-db-instance-from-db-snapshot \
    --db-instance-identifier docclinic-db-restored \
    --db-snapshot-identifier docclinic-manual-backup-20260210
```

### Application Rollback

```bash
# On EC2
cd /app

# List available backups
ls -la backup-*

# Rollback to previous version
docker-compose -f current/docker-compose.production.yml down
mv current current-failed
mv backup-YYYYMMDD-HHMMSS current
cd current
docker-compose -f docker-compose.production.yml up -d
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check Docker logs
docker-compose -f docker-compose.production.yml logs api

# Check environment variables
cat .env | head -20

# Verify database connection
docker-compose -f docker-compose.production.yml exec api \
    npx prisma db execute --stdin <<< "SELECT 1"
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal

# Check Nginx SSL config
sudo nginx -t
```

### Database Connection Issues

```bash
# Test connection from EC2
psql -h RDS_ENDPOINT -U docclinic -d docclinic

# Check security groups
aws ec2 describe-security-groups --group-ids sg-xxx
```

### Out of Memory

```bash
# Check memory usage
free -m
docker stats

# Restart with memory limits
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d
```

---

## Cost Optimization Tips

1. **Use Reserved Instances** - Save up to 72% on EC2 if running long-term
2. **Enable S3 Lifecycle Policies** - Move old files to cheaper storage
3. **Review CloudWatch Logs** - Reduce retention if not needed
4. **Stop Non-Production** - Use `aws ec2 stop-instances` when not testing

---

## Support

For issues:
1. Check CloudWatch logs
2. Review this documentation
3. Open a GitHub issue

---

*Last Updated: February 2026*
