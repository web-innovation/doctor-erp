# Email Setup Guide

This guide explains how to set up email notifications for DocClinic ERP.

## Supported Providers

1. **Gmail App Password** - ⭐ **Easiest option** - No Google Cloud setup needed
2. **Gmail (OAuth2)** - More secure but requires Google Cloud Console setup
3. **Microsoft Outlook (OAuth2)** - For Microsoft 365/Outlook accounts
4. **SMTP** - For AWS SES, SendGrid, or any SMTP server

---

## Option 1: Gmail App Password (Recommended for Small Clinics)

This is the **simplest setup** - no Google Cloud Console or app verification needed.

### Step 1: Enable 2-Factor Authentication

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "How you sign in to Google", click **2-Step Verification**
3. Follow the prompts to enable 2FA

### Step 2: Generate App Password

1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Click **Select app** → Choose "Mail"
3. Click **Select device** → Choose your device or "Other"
4. Click **Generate**
5. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### Step 3: Configure DocClinic

**Option A: Settings UI (Easiest)**

1. Go to **Settings** > **Email** in DocClinic
2. Select **Gmail (App Password)** 
3. Enter your Gmail address
4. Paste the 16-character App Password
5. Click **Save Configuration**
6. Click **Send Test Email** to verify

**Option B: Environment Variables**

```env
EMAIL_PROVIDER=gmail-app-password
EMAIL_USER=your-email@gmail.com
EMAIL_FROM_NAME=DocClinic
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

---

## Option 2: Gmail OAuth2 Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Name it something like "DocClinic Email"

### Step 2: Enable Gmail API

1. Go to **APIs & Services** > **Library**
2. Search for "Gmail API"
3. Click **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** (or Internal if using Google Workspace)
3. Fill in the required fields:
   - App name: `DocClinic`
   - User support email: Your email
   - Developer contact email: Your email
4. Click **Save and Continue**
5. Add scopes:
   - `https://mail.google.com/` (Full Gmail access)
6. Add test users (your Gmail address)
7. Complete the setup

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Choose **Web application**
4. Name: `DocClinic Email Client`
5. Add Authorized redirect URIs:
   ```
   https://developers.google.com/oauthplayground
   ```
6. Click **Create**
7. **Save the Client ID and Client Secret**

### Step 5: Get Refresh Token

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground)
2. Click the gear icon (⚙️) in the top right
3. Check **Use your own OAuth credentials**
4. Enter your Client ID and Client Secret
5. Close settings
6. In the left panel, find **Gmail API v1**
7. Select `https://mail.google.com/`
8. Click **Authorize APIs**
9. Sign in with your Gmail account
10. Allow access
11. Click **Exchange authorization code for tokens**
12. **Copy the Refresh Token**

### Step 6: Configure DocClinic

**Option A: Environment Variables**

```env
EMAIL_PROVIDER=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_FROM_NAME=DocClinic
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
GMAIL_REFRESH_TOKEN=1//xxxxxxxxxxxxx
```

**Option B: Settings UI**

1. Go to **Settings** > **Email** in DocClinic
2. Select **Gmail (OAuth2)**
3. Enter your credentials
4. Click **Save Configuration**
5. Click **Send Test Email** to verify

---

## Option 2: Microsoft Outlook OAuth2 Setup

### Step 1: Register Azure AD Application

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in:
   - Name: `DocClinic Email`
   - Supported account types: Choose based on your needs
   - Redirect URI: `https://login.microsoftonline.com/common/oauth2/nativeclient`
5. Click **Register**
6. **Copy the Application (client) ID and Directory (tenant) ID**

### Step 2: Create Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Description: `DocClinic Production`
4. Choose expiry (recommend 24 months)
5. Click **Add**
6. **Copy the secret value immediately** (you can't see it again)

### Step 3: Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add these permissions:
   - `Mail.Send`
   - `Mail.ReadWrite`
   - `offline_access`
6. Click **Grant admin consent** (if you have admin rights)

### Step 4: Get Refresh Token

Use Postman or curl to get the initial tokens:

```bash
# Step 1: Get authorization code (open in browser)
https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize?
  client_id={client-id}&
  response_type=code&
  redirect_uri=https://login.microsoftonline.com/common/oauth2/nativeclient&
  scope=offline_access%20Mail.Send%20Mail.ReadWrite

# Step 2: Exchange code for tokens
curl -X POST https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token \
  -d "client_id={client-id}" \
  -d "client_secret={client-secret}" \
  -d "code={authorization-code}" \
  -d "redirect_uri=https://login.microsoftonline.com/common/oauth2/nativeclient" \
  -d "grant_type=authorization_code"
```

### Step 5: Configure DocClinic

```env
EMAIL_PROVIDER=outlook
EMAIL_USER=your-email@outlook.com
EMAIL_FROM_NAME=DocClinic
OUTLOOK_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
OUTLOOK_CLIENT_SECRET=your-client-secret
OUTLOOK_REFRESH_TOKEN=your-refresh-token
OUTLOOK_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## Option 3: SMTP Setup (AWS SES, SendGrid, etc.)

### AWS SES Setup

1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/)
2. Verify your domain or email address
3. Get SMTP credentials:
   - Go to **SMTP settings**
   - Click **Create SMTP credentials**
   - Save the username and password

```env
EMAIL_PROVIDER=smtp
EMAIL_USER=noreply@yourdomain.com
EMAIL_FROM_NAME=DocClinic
SMTP_HOST=email-smtp.ap-south-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-user
SMTP_PASSWORD=your-ses-smtp-password
SMTP_SECURE=false
```

### SendGrid Setup

1. Go to [SendGrid](https://sendgrid.com/)
2. Create an API key with Mail Send permissions
3. Verify your sender identity

```env
EMAIL_PROVIDER=smtp
EMAIL_USER=noreply@yourdomain.com
EMAIL_FROM_NAME=DocClinic
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_SECURE=false
```

---

## Email Notification Types

DocClinic supports these automated notifications:

| Type | Description | Trigger |
|------|-------------|---------|
| Appointment Reminder | Reminds patients of upcoming appointments | Manual or scheduled (24h before) |
| Prescription | Sends prescription details with PDF | When marked "Send via Email" |
| Bill/Invoice | Sends invoice with payment details | When marked "Send via Email" |
| Password Reset | Secure password reset link | Forgot password request |
| Welcome Email | Account creation confirmation | New user registration |

---

## API Endpoints

### Configuration

```http
# Get email configuration (masked)
GET /api/notifications/email/config

# Save email configuration
POST /api/notifications/email/config
Content-Type: application/json

{
  "provider": "gmail",
  "userEmail": "your-email@gmail.com",
  "fromName": "DocClinic",
  "clientId": "xxx.apps.googleusercontent.com",
  "clientSecret": "GOCSPX-xxx",
  "refreshToken": "1//xxx"
}

# Test email configuration
POST /api/notifications/email/test
```

### Send Notifications

```http
# Send appointment reminder
POST /api/notifications/appointment-reminder/:id

# Send prescription via email
POST /api/notifications/prescription/:id

# Send bill/invoice via email
POST /api/notifications/bill/:id

# Send bulk appointment reminders
POST /api/notifications/bulk-reminders
Content-Type: application/json

{
  "hours": 24
}
```

### Email Logs

```http
# Get email logs
GET /api/notifications/email/logs?page=1&limit=20&type=prescription&status=sent
```

---

## Troubleshooting

### Gmail Issues

| Error | Solution |
|-------|----------|
| `invalid_grant` | Refresh token expired. Generate a new one from OAuth Playground |
| `access_denied` | Check OAuth consent screen is configured correctly |
| `unauthorized_client` | Verify Client ID and Secret are correct |

### Outlook Issues

| Error | Solution |
|-------|----------|
| `AADSTS65001` | Admin consent required. Ask tenant admin to grant permissions |
| `AADSTS700016` | Application not found. Check tenant ID |
| `invalid_client` | Client secret may have expired. Create a new one |

### SMTP Issues

| Error | Solution |
|-------|----------|
| Connection timeout | Check firewall allows outbound port 587/465 |
| Authentication failed | Verify SMTP credentials are correct |
| Sender not verified | AWS SES requires email/domain verification |

---

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for all secrets
3. **Rotate refresh tokens** periodically (every 6 months)
4. **Monitor email logs** for suspicious activity
5. **Use dedicated email accounts** for application sending
6. **Enable 2FA** on all email provider accounts

---

## Database Schema

Email logs are stored for HIPAA audit compliance:

```prisma
model EmailLog {
  id             String    @id @default(uuid())
  recipientEmail String
  subject        String
  type           String    // appointment_reminder, prescription, bill, etc.
  status         String    // sent, failed
  messageId      String?
  error          String?
  sentAt         DateTime  @default(now())
  userId         String?
  patientId      String?
}

model ClinicSettings {
  id        String   @id @default(uuid())
  key       String
  value     String   // JSON encoded configuration
  clinicId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([clinicId, key])
}
```

Run migration after setup:

```bash
cd server
npx prisma migrate dev --name add_email_logs
```
