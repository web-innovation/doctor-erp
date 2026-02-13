# DocClinic ERP

**Smart Healthcare Management for Modern Clinics**

A comprehensive Doctor Consultation & Pharmacy Management System with WhatsApp integration.

## 🌟 Features

### 👨‍⚕️ Doctor Module
- **Patient Management**: Complete patient history, vitals tracking, medical records
- **Smart Prescriptions**: Write prescriptions with pharmacy stock integration, dosage guidelines
- **OPD Management**: Appointment calendar, queue management, consultation tracking

### 💊 Pharmacy Module
- **Inventory Management**: Stock tracking, low stock alerts, expiry management
- **Bill Image Processing**: Upload purchase bills, auto-extract products using AI
- **Stock Reports**: Comprehensive stock movement and valuation reports

### 💰 Billing Module
- **GST Compliant**: Automatic GST/CGST/SGST calculations
- **Flexible Payment**: Multiple payment methods, partial payments
- **Invoice Generation**: Professional invoices with clinic branding

### 👥 Staff Module
- **Employee Management**: Staff profiles, designation, salary management
- **Attendance Tracking**: Check-in/out via WhatsApp or web
- **Leave Management**: Apply, approve, reject leaves

### 📊 Reports & Analytics
- **Sales Reports**: Daily, weekly, monthly with growth trends
- **OPD Reports**: Patient count trends, peak hours analysis
- **Commission Reports**: Lab & agent commission tracking

### 🤝 Lab & Agent Module
- **Panel Labs**: Manage partner labs with commission settings
- **Agents**: Track referrals, commissions, discounts
- **Commission Payouts**: Track pending and paid commissions

### 📱 WhatsApp Integration
- **Appointment Booking**: Book appointments via WhatsApp
- **Prescription Delivery**: Send prescriptions directly to patient WhatsApp
- **Payment Processing**: Upload payment images, AI extracts details
- **Stock Updates**: Upload bill images to update pharmacy stock
- **Staff Attendance**: Check-in/out via WhatsApp
- **Reports on Demand**: Get sales, OPD reports via WhatsApp

## 🛠️ Tech Stack

### Backend
- **Node.js** + Express.js
- **SQLite (file-based) with Prisma ORM** for local development and production fallback
- **JWT** Authentication
- **Google Gemini AI** for image processing

### Frontend
- **React.js** with Vite
- **Tailwind CSS** for styling
- **TanStack Query** for data fetching
- **Recharts** for analytics
- **Zustand** for state management

### WhatsApp Bot
- **whatsapp-web.js** library
- **Gemini AI** for natural language understanding

### Infrastructure
- **Docker** containers
- **AWS** EC2 (t2.micro), S3, and CloudWatch (no managed DB provisioned by default)
- **GitHub Actions** CI/CD

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- Google Gemini API key (optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/docclinic-erp.git
cd docclinic-erp
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
# Server
cp server/.env.example server/.env
# Edit server/.env with your values

# WhatsApp Bot
cp whatsapp-bot/.env.example whatsapp-bot/.env
# Edit whatsapp-bot/.env with your values
```

4. **Setup database**
```bash
cd server
# Run migrations (development)
npx prisma migrate dev --name init
# Generate Prisma client
npx prisma generate
# Seed demo data (development)
node prisma/seed.js
```

Production note: when deploying to production use `prisma migrate deploy` (not `migrate dev`) and run the seed script only if you want demo/test data. Example production commands below.

5. **Start development servers**
```bash
# From root directory
npm run dev
```

This starts:
- API Server: http://localhost:3001
- React App: http://localhost:5173
- WhatsApp Bot (scan QR)

## 📁 Project Structure

```
docclinic-erp/
├── server/                 # Backend API
│   ├── src/
│   │   ├── config/        # Configuration
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Auth, error handling
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── utils/         # Helpers
│   └── prisma/            # Database schema
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── hooks/         # Custom hooks
│   │   └── context/       # React context
│   └── public/            # Static assets
├── whatsapp-bot/          # WhatsApp integration
│   ├── src/
│   │   ├── handlers/      # Message handlers
│   │   └── services/      # Bot services
├── aws/                   # AWS deployment configs
├── .github/workflows/     # CI/CD
└── docker-compose.yml     # Docker setup
```

## 🔐 Role-Based Access

| Role | Dashboard | Patients | Prescriptions | Pharmacy | Billing | Staff | Reports |
|------|-----------|----------|---------------|----------|---------|-------|---------|
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| DOCTOR | ✅ | ✅ | ✅ | View | Create | View | ✅ |
| PHARMACIST | ✅ | View | View | ✅ | Create | - | View |
| RECEPTIONIST | ✅ | ✅ | View | - | Create | - | - |
| ACCOUNTANT | ✅ | View | - | View | ✅ | ✅ | ✅ |
| STAFF | Limited | View | - | - | - | Self | - |

## 🔑 Demo Credentials

> **HIPAA Compliant**: All passwords meet security requirements (14+ chars, mixed case, numbers, special characters)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@docclinic.com | `DocCl!n1c@Adm1n2024` |
| Doctor | doctor@demo.com | `D0ct0r@Demo!2024` |
| Receptionist | receptionist@demo.com | `Recept!0n@Demo24` |
| Pharmacist | pharmacist@demo.com | `Pharm@c1st!Demo24` |
| Accountant | accountant@demo.com | `Acc0unt@Demo!2024` |

## 📱 WhatsApp Commands

### Patient Commands
- `/book` - Book appointment
- `/status` - Check appointment status
- `/cancel [id]` - Cancel appointment
- `/prescription` - Get latest prescription

### Staff Commands
- `/checkin` - Mark attendance
- `/checkout` - Check out
- `/leave` - Apply for leave
- `/attendance` - View attendance

### Doctor Commands
- `/today` - Today's appointments
- `/queue` - Current queue
- `/next` - Call next patient
- `/sendprescription [rx-id] [phone]` - Send prescription

### Pharmacy Commands
- `/stock [medicine]` - Check stock
- `/lowstock` - Low stock alerts
- `/updatestock` - Update stock

### Report Commands
- `/sales [period]` - Sales report
- `/opd [period]` - OPD count

## 🚢 Deployment

### Using Docker (Local)
```bash
docker-compose up -d
```

### AWS Deployment (Fully Automated - Zero Touch)

The CI/CD pipeline handles **everything automatically**:
-- ✅ Infrastructure provisioning (VPC, EC2, S3)
-- ✅ SSH key generation and secure storage
-- ✅ Application secrets management (DB is file-based by default)
- ✅ Application secrets management
- ✅ Build, test, and deploy
- ✅ Database migrations
- ✅ Health checks and rollback

#### Required GitHub Secrets

Add these in your repo **Settings → Secrets → Actions**:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |

> **That's it!** No manual AWS console work needed.

#### IAM Permissions Required

Your IAM user needs these permissions:
	- `AmazonEC2FullAccess`
- `AmazonS3FullAccess`
- `AmazonVPCFullAccess`
- `IAMFullAccess`
- `SecretsManagerReadWrite`
- `CloudFormationFullAccess`
- `CloudWatchLogsFullAccess`

### Production DB migration & seed (example)
Run these on the server/CI where the production database is accessible. DO NOT run `migrate dev` in production.
```bash
# Apply migrations (idempotent)
npx prisma migrate deploy --schema=./prisma/schema.prisma
# Generate client
npx prisma generate --schema=./prisma/schema.prisma
# Optional: run seed script only to populate demo/test data (skip in real production)
node prisma/seed.js
```

#### Deploy

Just push to `master` branch:
```bash
git push origin master
```

The pipeline will:
1. **Create infrastructure** (first run) - ~15 mins
2. **Build and test** application
3. **Deploy** to EC2
4. **Run migrations**
5. **Health check**

#### Manual Actions (Optional)

Go to **Actions → AWS Full Automation** → **Run workflow**:
- `deploy` - Force redeploy
- `destroy` - Tear down all infrastructure
- `infrastructure-only` - Only update infrastructure

#### Estimated AWS Costs (Free Tier Eligible)
- EC2 t2.micro: Free (750 hrs/month for 12 months)
- S3: Free (5GB storage)
- Data Transfer: Free (15GB/month)

#### Access Your Application

After deployment, access your app at:
```
http://<EC2_PUBLIC_IP>
```

Find your EC2 IP in:
1. **GitHub Actions** → Last deployment run → Summary
2. **AWS Console** → EC2 → Instances → DocClinic server
3. **AWS CLI**: `aws cloudformation describe-stacks --stack-name docclinic-production --query 'Stacks[0].Outputs[?OutputKey==`PublicIP`].OutputValue' --output text`

> **Note**: Uses HTTP (no HTTPS) since this is a Free Tier setup without a domain name.

## 📄 License

Private - All rights reserved

## 🤝 Support

For support, email support@docclinic.com
