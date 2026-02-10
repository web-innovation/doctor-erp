#!/bin/bash
# ==============================================
# DocClinic ERP - EC2 Initial Setup Script
# Run this after CloudFormation deployment
# ==============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=== DocClinic EC2 Setup ===${NC}"

# ===========================================
# 1. Update System
# ===========================================
echo -e "\n${BLUE}[1/8] Updating system packages...${NC}"
sudo yum update -y

# ===========================================
# 2. Install Docker
# ===========================================
echo -e "\n${BLUE}[2/8] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -a -G docker ec2-user
    echo -e "${GREEN}Docker installed${NC}"
else
    echo -e "${YELLOW}Docker already installed${NC}"
fi

# ===========================================
# 3. Install Docker Compose
# ===========================================
echo -e "\n${BLUE}[3/8] Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}Docker Compose installed${NC}"
else
    echo -e "${YELLOW}Docker Compose already installed${NC}"
fi

# ===========================================
# 4. Install Nginx
# ===========================================
echo -e "\n${BLUE}[4/8] Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    sudo yum install -y nginx
    sudo systemctl enable nginx
    echo -e "${GREEN}Nginx installed${NC}"
else
    echo -e "${YELLOW}Nginx already installed${NC}"
fi

# ===========================================
# 5. Install Certbot for SSL
# ===========================================
echo -e "\n${BLUE}[5/8] Installing Certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    sudo yum install -y certbot python3-certbot-nginx
    echo -e "${GREEN}Certbot installed${NC}"
else
    echo -e "${YELLOW}Certbot already installed${NC}"
fi

# ===========================================
# 6. Setup App Directory
# ===========================================
echo -e "\n${BLUE}[6/8] Setting up app directory...${NC}"
sudo mkdir -p /app/current
sudo mkdir -p /var/log/docclinic
sudo mkdir -p /var/www/certbot
sudo chown -R ec2-user:ec2-user /app
sudo chown -R ec2-user:ec2-user /var/log/docclinic

# ===========================================
# 7. Configure Firewall
# ===========================================
echo -e "\n${BLUE}[7/8] Configuring firewall...${NC}"
if command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --reload
    echo -e "${GREEN}Firewall configured${NC}"
else
    echo -e "${YELLOW}firewall-cmd not available, using security groups${NC}"
fi

# ===========================================
# 8. Pull Environment from Secrets Manager
# ===========================================
echo -e "\n${BLUE}[8/8] Pulling environment variables...${NC}"
if command -v aws &> /dev/null; then
    cd /app/current
    aws secretsmanager get-secret-value \
        --secret-id docclinic/production/env \
        --query SecretString \
        --output text > .env 2>/dev/null || echo -e "${YELLOW}Could not fetch secrets (normal if not set up yet)${NC}"
else
    echo -e "${YELLOW}AWS CLI not available, skipping secret fetch${NC}"
fi

# ===========================================
# Summary
# ===========================================
echo -e "\n${GREEN}=== Setup Complete ===${NC}"
echo -e "\nInstalled components:"
echo -e "  • Docker: $(docker --version 2>/dev/null || echo 'Not installed')"
echo -e "  • Docker Compose: $(docker-compose --version 2>/dev/null || echo 'Not installed')"
echo -e "  • Nginx: $(nginx -v 2>&1 || echo 'Not installed')"
echo -e "  • Certbot: $(certbot --version 2>/dev/null || echo 'Not installed')"

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Run: newgrp docker  (to use docker without sudo)"
echo "2. Set up SSL: sudo certbot --nginx -d your-domain.com"
echo "3. Copy Nginx config: sudo cp /app/current/aws/nginx/docclinic.conf /etc/nginx/conf.d/"
echo "4. Deploy app: Push to main branch on GitHub"

echo -e "\n${YELLOW}SSL Setup (Free with Let's Encrypt):${NC}"
echo "  sudo certbot --nginx -d YOUR_DOMAIN.com"
echo "  # Auto-renewal test:"
echo "  sudo certbot renew --dry-run"
