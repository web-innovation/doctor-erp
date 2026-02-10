# ==============================================
# DocClinic ERP - AWS Initial Setup Script
# Run this ONCE to setup GitHub secrets
# ==============================================

# Check if AWS CLI is configured
Write-Host "Checking AWS CLI configuration..." -ForegroundColor Cyan

try {
    $identity = aws sts get-caller-identity | ConvertFrom-Json
    Write-Host "AWS CLI configured for account: $($identity.Account)" -ForegroundColor Green
    Write-Host "User ARN: $($identity.Arn)" -ForegroundColor Gray
} catch {
    Write-Host "ERROR: AWS CLI not configured. Run 'aws configure' first." -ForegroundColor Red
    exit 1
}

# Check if GitHub CLI is installed
Write-Host "`nChecking GitHub CLI..." -ForegroundColor Cyan
if (!(Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "GitHub CLI not found. Install from: https://cli.github.com/" -ForegroundColor Yellow
    Write-Host "Or manually add secrets in GitHub repo Settings -> Secrets -> Actions" -ForegroundColor Yellow
    $useGh = $false
} else {
    Write-Host "GitHub CLI found" -ForegroundColor Green
    $useGh = $true
    
    # Check if logged in
    try {
        gh auth status 2>$null
    } catch {
        Write-Host "Please login to GitHub CLI: gh auth login" -ForegroundColor Yellow
        $useGh = $false
    }
}

# Get AWS credentials
Write-Host "`nReading AWS credentials..." -ForegroundColor Cyan

$awsCredFile = "$env:USERPROFILE\.aws\credentials"
if (Test-Path $awsCredFile) {
    $creds = Get-Content $awsCredFile -Raw
    
    # Parse default profile
    if ($creds -match "aws_access_key_id\s*=\s*(\S+)") {
        $accessKey = $matches[1]
    }
    if ($creds -match "aws_secret_access_key\s*=\s*(\S+)") {
        $secretKey = $matches[1]
    }
    
    Write-Host "Found AWS Access Key: $($accessKey.Substring(0,4))****" -ForegroundColor Green
} else {
    Write-Host "AWS credentials file not found at $awsCredFile" -ForegroundColor Red
    exit 1
}

# Set secrets in GitHub
if ($useGh) {
    Write-Host "`nSetting GitHub repository secrets..." -ForegroundColor Cyan
    
    # Get repo name
    $repoUrl = git config --get remote.origin.url
    if ($repoUrl -match "github\.com[:/](.+?)(?:\.git)?$") {
        $repo = $matches[1]
        Write-Host "Repository: $repo" -ForegroundColor Gray
        
        # Set secrets
        Write-Host "Setting AWS_ACCESS_KEY_ID..." -ForegroundColor Yellow
        $accessKey | gh secret set AWS_ACCESS_KEY_ID -R $repo
        
        Write-Host "Setting AWS_SECRET_ACCESS_KEY..." -ForegroundColor Yellow
        $secretKey | gh secret set AWS_SECRET_ACCESS_KEY -R $repo
        
        Write-Host "`n✅ GitHub secrets configured successfully!" -ForegroundColor Green
    } else {
        Write-Host "Could not determine GitHub repository" -ForegroundColor Red
    }
} else {
    Write-Host "`n========================================" -ForegroundColor Yellow
    Write-Host "MANUAL SETUP REQUIRED" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "`nAdd these secrets to your GitHub repository:"
    Write-Host "Go to: Settings -> Secrets and variables -> Actions -> New repository secret"
    Write-Host ""
    Write-Host "Secret 1:" -ForegroundColor Cyan
    Write-Host "  Name:  AWS_ACCESS_KEY_ID"
    Write-Host "  Value: $accessKey"
    Write-Host ""
    Write-Host "Secret 2:" -ForegroundColor Cyan
    Write-Host "  Name:  AWS_SECRET_ACCESS_KEY"
    Write-Host "  Value: $secretKey"
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SETUP COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Push to main branch to trigger deployment" -ForegroundColor Gray
Write-Host "2. First deployment creates all AWS infrastructure automatically" -ForegroundColor Gray
Write-Host "3. Check GitHub Actions for deployment progress" -ForegroundColor Gray
Write-Host ""
Write-Host "AWS Resources that will be created:" -ForegroundColor White
Write-Host "  - VPC with public subnets" -ForegroundColor Gray
Write-Host "  - EC2 t2.micro instance (Free Tier)" -ForegroundColor Gray
Write-Host "  - S3 bucket for uploads" -ForegroundColor Gray
Write-Host "  - Security groups" -ForegroundColor Gray
Write-Host "  - IAM roles" -ForegroundColor Gray
Write-Host "  - Note: This deployment uses a file-based SQLite DB by default; external DBs can be configured separately" -ForegroundColor Gray
Write-Host ""
Write-Host "Estimated monthly cost: `$0 (Free Tier) to `$25" -ForegroundColor Green
