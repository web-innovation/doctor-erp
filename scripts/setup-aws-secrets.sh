#!/bin/bash
# ==============================================
# DocClinic ERP - AWS Secrets Manager Setup
# Run this script once to set up secrets
# ==============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== DocClinic AWS Secrets Setup ===${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

# Get AWS region
AWS_REGION=${AWS_REGION:-"ap-south-1"}
echo -e "${YELLOW}Using AWS Region: $AWS_REGION${NC}"

# Function to create or update secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    echo -e "Creating secret: ${YELLOW}$secret_name${NC}"
    
    if aws secretsmanager describe-secret --secret-id "$secret_name" --region "$AWS_REGION" 2>/dev/null; then
        aws secretsmanager update-secret \
            --secret-id "$secret_name" \
            --secret-string "$secret_value" \
            --region "$AWS_REGION"
        echo -e "${GREEN}Updated existing secret: $secret_name${NC}"
    else
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --description "$description" \
            --secret-string "$secret_value" \
            --region "$AWS_REGION"
        echo -e "${GREEN}Created new secret: $secret_name${NC}"
    fi
}

# ==============================================
# 1. Generate secure keys
# ==============================================
echo -e "\n${GREEN}Generating secure keys...${NC}"

JWT_SECRET=$(openssl rand -hex 64)
HIPAA_ENCRYPTION_KEY=$(openssl rand -hex 32)
HIPAA_HASH_SALT=$(openssl rand -hex 16)

# ==============================================
# 2. Collect user input
# ==============================================
echo -e "\n${GREEN}Please provide the following information:${NC}"

read -p "Database Host (RDS endpoint): " DB_HOST
read -p "Database Name [docclinic]: " DB_NAME
DB_NAME=${DB_NAME:-"docclinic"}
read -p "Database Username [docclinic]: " DB_USER
DB_USER=${DB_USER:-"docclinic"}
read -sp "Database Password: " DB_PASSWORD
echo
read -p "Your domain name (optional, press Enter to skip): " DOMAIN_NAME

# ==============================================
# 3. Create production environment secret
# ==============================================
echo -e "\n${GREEN}Creating production environment secret...${NC}"

ENV_SECRET=$(cat << EOF
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}

# Security - Auto-generated secure keys
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

# HIPAA Compliance
HIPAA_ENCRYPTION_KEY=${HIPAA_ENCRYPTION_KEY}
HIPAA_HASH_SALT=${HIPAA_HASH_SALT}
SESSION_TIMEOUT_MINUTES=30
MAX_CONCURRENT_SESSIONS=3

# CORS - Update with your domain
CORS_ORIGIN=${DOMAIN_NAME:-"*"}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info

# AWS
AWS_REGION=${AWS_REGION}
EOF
)

create_or_update_secret \
    "docclinic/production/env" \
    "$ENV_SECRET" \
    "DocClinic production environment variables"

# ==============================================
# 4. Store SSH key for CI/CD
# ==============================================
echo -e "\n${GREEN}Setting up SSH key for CI/CD...${NC}"

SSH_KEY_PATH="$HOME/.ssh/docclinic-key.pem"
if [ -f "$SSH_KEY_PATH" ]; then
    echo -e "${YELLOW}Found existing SSH key at $SSH_KEY_PATH${NC}"
    read -p "Use this key for CI/CD? (y/n): " USE_KEY
    if [ "$USE_KEY" = "y" ]; then
        SSH_KEY=$(cat "$SSH_KEY_PATH")
        create_or_update_secret \
            "docclinic/ec2-ssh-key" \
            "$SSH_KEY" \
            "EC2 SSH private key for CI/CD deployment"
    fi
else
    echo -e "${YELLOW}No SSH key found at $SSH_KEY_PATH${NC}"
    echo "Please create a key pair in AWS EC2 console and save it,"
    echo "then run this script again, or manually add the secret:"
    echo "  aws secretsmanager create-secret --name docclinic/ec2-ssh-key --secret-string file://your-key.pem"
fi

# ==============================================
# 5. Create database credentials secret
# ==============================================
echo -e "\n${GREEN}Creating database credentials secret...${NC}"

DB_SECRET=$(cat << EOF
{
  "host": "${DB_HOST}",
  "port": 5432,
  "database": "${DB_NAME}",
  "username": "${DB_USER}",
  "password": "${DB_PASSWORD}"
}
EOF
)

create_or_update_secret \
    "docclinic/production/database" \
    "$DB_SECRET" \
    "DocClinic production database credentials"

# ==============================================
# 6. Summary
# ==============================================
echo -e "\n${GREEN}=== Setup Complete ===${NC}"
echo -e "\nSecrets created in AWS Secrets Manager:"
echo "  • docclinic/production/env"
echo "  • docclinic/ec2-ssh-key (if SSH key was provided)"
echo "  • docclinic/production/database"

echo -e "\n${YELLOW}Important: Add these secrets to GitHub Repository Settings > Secrets:${NC}"
echo "  • AWS_ACCESS_KEY_ID"
echo "  • AWS_SECRET_ACCESS_KEY"

echo -e "\n${GREEN}Generated secure keys (saved in AWS Secrets Manager):${NC}"
echo "  • JWT_SECRET: ${JWT_SECRET:0:20}... (truncated)"
echo "  • HIPAA_ENCRYPTION_KEY: ${HIPAA_ENCRYPTION_KEY:0:20}... (truncated)"

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Add AWS credentials to GitHub Secrets"
echo "2. Update your domain in the environment secret"
echo "3. Deploy using: git push origin main"
