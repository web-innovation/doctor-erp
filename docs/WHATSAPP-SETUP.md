# WhatsApp Notification Setup Guide

This guide explains how to configure WhatsApp notifications in DocClinic ERP. You can choose from three methods based on your needs:

1. **Manual (wa.me links)** - Free, no setup required
2. **Twilio WhatsApp API** - Automated sending, paid service
3. **WhatsApp Business Cloud API** - Official Meta API, free tier available

---

## Table of Contents

- [Option 1: Manual Mode (wa.me Links)](#option-1-manual-mode-wame-links)
- [Option 2: Twilio WhatsApp API](#option-2-twilio-whatsapp-api)
- [Option 3: WhatsApp Business Cloud API](#option-3-whatsapp-business-cloud-api)
- [Personal WhatsApp Account Setup](#personal-whatsapp-account-setup)
- [Configuration in DocClinic](#configuration-in-docclinic)
- [Troubleshooting](#troubleshooting)

---

## Option 1: Manual Mode (wa.me Links)

**Cost:** Free  
**Automation:** None (requires manual click to send)  
**Best for:** Small clinics, occasional notifications

### How It Works

1. When you click "Send WhatsApp" in the app, it opens WhatsApp Web/Desktop with a pre-filled message
2. You review the message and click Send
3. Message goes from your personal/business WhatsApp number

### Setup

1. Go to **Settings → WhatsApp** in DocClinic
2. Select **Manual (wa.me links)** as the provider
3. Enter your clinic's WhatsApp number and display name
4. Click **Save Configuration**

No additional setup required! Just make sure you have WhatsApp installed on your device.

---

## Option 2: Twilio WhatsApp API

**Cost:** ~$0.005 per message + Twilio account fees  
**Automation:** Full (messages sent automatically)  
**Best for:** Medium clinics, automated reminders

### Step 1: Create Twilio Account

1. Go to [twilio.com](https://www.twilio.com) and sign up
2. Complete phone verification
3. Note your **Account SID** and **Auth Token** from the dashboard

### Step 2: Enable WhatsApp Sandbox (Testing)

1. In Twilio Console, go to **Messaging → Try it out → Send a WhatsApp message**
2. Follow the instructions to join the sandbox:
   - Send `join <your-sandbox-keyword>` to the Twilio sandbox number
   - Example: Send "join helpful-tiger" to +1 415 523 8886
3. Note the sandbox number (e.g., `+14155238886`)

### Step 3: Production Setup (Optional)

For production use with your own number:

1. Go to **Messaging → Senders → WhatsApp Senders**
2. Click **New WhatsApp Sender**
3. Connect your WhatsApp Business Account
4. Complete Meta Business verification
5. Submit message templates for approval

### Step 4: Configure in DocClinic

1. Go to **Settings → WhatsApp**
2. Select **Twilio** as provider
3. Enter:
   - **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Auth Token**: Your auth token
   - **WhatsApp Number**: `+14155238886` (sandbox) or your approved number
4. Click **Save Configuration**
5. Send a test message to verify

---

## Option 3: WhatsApp Business Cloud API

**Cost:** Free for first 1,000 conversations/month  
**Automation:** Full (messages sent automatically)  
**Best for:** Larger clinics, official WhatsApp Business presence

### Step 1: Create Meta Business Account

1. Go to [business.facebook.com](https://business.facebook.com)
2. Click **Create Account**
3. Enter your business details:
   - Business name (your clinic name)
   - Your name
   - Business email
4. Verify your email

### Step 2: Create Meta Developer Account

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **Get Started**
3. Accept the terms and complete registration

### Step 3: Create WhatsApp Business App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Click **Create App**
3. Select **Business** type
4. Enter app name (e.g., "DocClinic WhatsApp")
5. Select your Business Account
6. Click **Create App**

### Step 4: Add WhatsApp Product

1. In your app dashboard, find **WhatsApp** and click **Set up**
2. Select your Business Account (or create new)
3. You'll see a test phone number assigned

### Step 5: Get API Credentials

1. Go to **WhatsApp → API Setup**
2. Note the following:
   - **Phone Number ID**: Numbers displayed under your test number
   - **WhatsApp Business Account ID**: Found in the URL or settings
3. Generate a **Permanent Access Token**:
   - Go to **Business Settings → System Users**
   - Create a system user with admin access
   - Generate token with `whatsapp_business_messaging` permission

### Step 6: Add Your Phone Number (Production)

1. Go to **WhatsApp → Phone Numbers**
2. Click **Add Phone Number**
3. Enter your business phone number
4. Verify via SMS or Voice call
5. Complete business verification if required

### Step 7: Create Message Templates (Required for Production)

1. Go to **WhatsApp → Message Templates**
2. Click **Create Template**
3. Create templates for:
   - Appointment reminders
   - Prescription notifications
   - Bill/Invoice notifications
4. Submit for approval (usually 24-48 hours)

Example template:
```
Name: appointment_reminder
Category: UTILITY
Language: English

Header: 📅 Appointment Reminder
Body: Hello {{1}}, this is a reminder for your appointment at {{2}} on {{3}} at {{4}}. Reply CONFIRM to confirm or CANCEL to cancel.
Footer: {{5}}
```

### Step 8: Configure in DocClinic

1. Go to **Settings → WhatsApp**
2. Select **WhatsApp Business API** as provider
3. Enter:
   - **Phone Number ID**: From step 5
   - **Access Token**: Permanent token from step 5
   - **Business Account ID**: From step 5
4. Click **Save Configuration**
5. Send a test message

---

## Personal WhatsApp Account Setup

If you want to use your personal WhatsApp number for clinic notifications:

### Using Manual Mode (Recommended)

1. Install WhatsApp on your phone or desktop
2. In DocClinic Settings → WhatsApp, select **Manual**
3. Enter your personal number as the clinic WhatsApp number
4. When sending notifications, the app opens WhatsApp with the message ready
5. You simply tap Send

### Using WhatsApp Business App (Free)

For a more professional setup with your personal number:

1. Download **WhatsApp Business** app (separate from regular WhatsApp)
2. Register with your phone number
3. Set up your business profile:
   - Business name: Your clinic name
   - Category: Medical & Health
   - Description: Brief clinic description
   - Address, hours, email, website
4. Create quick replies for common messages
5. Set up greeting and away messages

### Converting Personal to Business Account

1. Backup your WhatsApp chat history
2. Download WhatsApp Business app
3. During setup, choose to migrate from WhatsApp Messenger
4. Your chats and contacts will transfer
5. Set up your business profile

> ⚠️ **Note:** You cannot use the same number on both WhatsApp Messenger and WhatsApp Business simultaneously.

---

## Configuration in DocClinic

### Accessing WhatsApp Settings

1. Log in as Doctor/Admin
2. Go to **Settings** (gear icon in sidebar)
3. Click **WhatsApp** tab

### Configuration Fields

| Field | Description |
|-------|-------------|
| Enable WhatsApp | Turn notifications on/off |
| Provider | Manual, Twilio, or WhatsApp Business API |
| Clinic WhatsApp Number | Number displayed to patients |
| Clinic WhatsApp Name | Name shown in messages |

### Testing Configuration

1. After saving, click **Send Test Message**
2. Enter a test phone number
3. For Manual: Opens WhatsApp with test message
4. For API: Sends actual message to the number

---

## Troubleshooting

### Manual Mode Issues

**Problem:** wa.me link not opening WhatsApp  
**Solution:** Ensure WhatsApp is installed. On desktop, install WhatsApp Desktop app.

**Problem:** Message appears empty  
**Solution:** Some characters may not encode properly. Check the message for special characters.

### Twilio Issues

**Problem:** "Message could not be sent"  
**Solution:** 
- Verify Account SID and Auth Token
- Check if recipient has opted in (sandbox requires joining)
- Ensure sufficient Twilio balance

**Problem:** "Twilio number not WhatsApp enabled"  
**Solution:** Use the sandbox number for testing or complete WhatsApp sender setup.

### WhatsApp Business API Issues

**Problem:** "Access token invalid"  
**Solution:**
- Generate a new permanent token
- Ensure token has `whatsapp_business_messaging` permission
- Check if token was revoked in Meta Business settings

**Problem:** "Phone number not verified"  
**Solution:**
- Complete phone verification in Meta Developer Console
- Wait for business verification approval

**Problem:** "Template not found"  
**Solution:**
- For messages to users who haven't messaged you first, you must use approved templates
- Submit templates and wait for approval

### General Issues

**Problem:** Messages not delivering  
**Solution:**
- Verify recipient phone number format (include country code)
- Check if recipient has WhatsApp installed
- For API: Check message delivery status in provider dashboard

---

## Cost Comparison

| Method | Setup Cost | Per Message | Best For |
|--------|-----------|-------------|----------|
| Manual (wa.me) | Free | Free | Small clinics |
| Twilio | Free | ~$0.005 | Medium clinics |
| WhatsApp Business API | Free | First 1000 free/month | Large clinics |

---

## Security Considerations

1. **Never share API tokens** - Keep credentials secure
2. **Use environment variables** - Don't hardcode credentials
3. **Patient consent** - Ensure patients opt-in for WhatsApp notifications
4. **Data privacy** - Messages contain medical information; ensure compliance
5. **Access control** - Only authorized staff should access WhatsApp settings

---

## Support

For issues with:
- **Twilio**: [twilio.com/help](https://www.twilio.com/help)
- **WhatsApp Business API**: [developers.facebook.com/support](https://developers.facebook.com/support)
- **DocClinic**: Check logs at `server/logs/` or contact support

---

*Last updated: February 2026*
