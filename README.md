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
- **PostgreSQL** with Prisma ORM
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
- **AWS** EC2 (t2.micro), RDS PostgreSQL
- **GitHub Actions** CI/CD

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Google Gemini API key

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
npx prisma migrate dev
npx prisma db seed
```

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

### Using Docker
```bash
docker-compose up -d
```

### AWS Deployment
1. Create stack using CloudFormation:
```bash
aws cloudformation create-stack \
  --stack-name docclinic-prod \
  --template-body file://aws/cloudformation.yml \
  --parameters ParameterKey=DBPassword,ParameterValue=your-password \
  --capabilities CAPABILITY_IAM
```

2. Push to main branch - GitHub Actions will deploy automatically

## 📄 License

Private - All rights reserved

## 🤝 Support

For support, email support@docclinic.com
