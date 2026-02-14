# DocClinic ERP - KT (Knowledge Transfer) Demo Guide

## 🎥 Demo Video Script

This guide walks through all features for recording a demo/KT video.

---

## 🔐 Login Credentials

> **HIPAA Compliant Passwords**: All passwords meet HIPAA security requirements (14+ characters, mixed case, numbers, special characters)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@docclinic.com | `DocCl!n1c@Adm1n2024` |
| Doctor | doctor@demo.com | `D0ct0r@Demo!2024` |
| Receptionist | receptionist@demo.com | `Recept!0n@Demo24` |
| Pharmacist | pharmacist@demo.com | `Pharm@c1st!Demo24` |
| Accountant | accountant@demo.com | `Acc0unt@Demo!2024` |
| Second Doctor | doctorb@demo.com | `D0ct0rB@Demo!2024` |

---

**Clinic Admin (Doctor) credentials (demo):**

- Primary Clinic Doctor: `doctor@demo.com` / `D0ct0r@Demo!2024`
- Second Doctor (multi-doctor demo): `doctorb@demo.com` / `D0ct0rB@Demo!2024`


## 📋 Demo Flow (15-20 mins)

### 1. Landing Page (1 min)
- [ ] Open http://localhost:5173
- [ ] Show the landing page features
- [ ] Click "Login" button

### 2. Login as Doctor (30 sec)
- [ ] Enter: doctor@demo.com / D0ct0r@Demo!2024
- [ ] Click Login
- [ ] Enter: doctor@demo.com / D0ct0r@Demo!2024
- [ ] Click Login

> Tip: You can also login as the second doctor to demo multi-doctor behavior:
> - `doctorb@demo.com` / `D0ct0rB@Demo!2024`

### 3. Dashboard Overview (2 min)
- [ ] Show today's statistics:
  - Today's Appointments: 5
  - Today's Collection: ₹1,268
  - Patients Visited: 2
  - Pending Bills: ₹600
- [ ] Show appointment queue widget
- [ ] Show alerts (low stock items)
- [ ] Show recent patients

### 4. Patient Management (3 min)
- [ ] Go to Patients menu
- [ ] Show patient list with search
- [ ] Click on "Rahul Mehta" to view details
  - Show patient history
  - Show vitals
  - Show allergies
  - Show past prescriptions
- [ ] Create new patient (demo)
  - Name: Demo Patient
  - Phone: 9999999999
  - Gender: Male
  - Age: 30

### 5. Appointments (2 min)
- [ ] Go to Appointments
- [ ] Show today's queue
- [ ] Show different statuses:
  - Scheduled (blue)
  - In Queue (yellow)
  - In Progress (orange)
  - Completed (green)
- [ ] Show calendar view
- [ ] Book new appointment via "+" button

### 6. Prescription Writing (3 min)
- [ ] Click on patient "Vikram Singh" (diabetes follow-up)
- [ ] Click "Write Prescription"
- [ ] Show:
  - Auto-filled patient info
  - Vitals entry
  - Diagnosis entry
  - Medicine search (type "Para" to find Paracetamol)
  - Dosage shorthand (1-0-1)
  - Advice section
- [ ] Save & Print prescription
- [ ] Show PDF generation

### 7. Pharmacy Management (2 min)
- [ ] Go to Pharmacy
- [ ] Show product list with stock
- [ ] Show LOW STOCK alert (Diclofenac - 8 qty)
- [ ] Show expiry tracking
- [ ] Filter by category
- [ ] Show stock update feature

### 8. Billing with GST (2 min)
- [ ] Go to Billing
- [ ] Show invoice list
- [ ] Click "+ New Bill"
- [ ] Select patient
- [ ] Add items:
  - Consultation: ₹500
  - Medicines: Paracetamol
- [ ] Show GST calculation:
  - Subtotal
  - CGST 9%
  - SGST 9%
  - Total
- [ ] Apply discount
- [ ] Select payment method
- [ ] Generate bill
- [ ] Print invoice

### 9. Reports (1 min)
- [ ] Go to Reports
- [ ] Show OPD Count report
- [ ] Show Collection summary
- [ ] Show Date range filter
- [ ] Export to Excel option

### 10. Staff Management (1 min)
- [ ] Go to Staff
- [ ] Show staff list
- [ ] Show attendance feature
- [ ] Mark check-in/check-out

### 11. Labs & Agents (1 min)
- [ ] Go to Labs & Agents
- [ ] Show lab list with commission
- [ ] Show pending commissions
  - [ ] Open a lab and navigate to "Manage Tests" to show the per-lab test catalog (CBC, HbA1c, Lipid panel are seeded for demo).
  - [ ] Show that selecting a lab test on a bill attaches lab metadata to the bill item.

### 12. Settings (30 sec)
- [ ] Go to Settings
- [ ] Show clinic configuration
- [ ] Show GST settings
- [ ] Show working hours

---

## 🔁 Testing Permissions & "View As" (quick)

1. Open `Settings → Access Management → Role Permissions`.
  - Toggle `labs:create` or `agents:create` for a role and observe that the Add button appears/disappears on the `Labs & Agents` page.
  - Note: `manage`/`create` permissions will auto-select `read` to avoid giving partial access.

2. Test impersonation (View As):
  - As a clinic admin (e.g., `doctor@demo.com`), use the "View As" feature to impersonate another staff user.
  - While impersonating, navigate to `Labs & Agents` to verify the UI and buttons match the impersonated user's permissions.

3. Seed verification:
  - Ensure demo lab tests are present after seeding: `cd server && node prisma/seed.js`.
  - If migrations changed, run `npx prisma migrate dev --name <name>` before seeding in development.

4. Quick troubleshooting:
  - If the Add/Edit/Delete buttons still appear for a role, check `Settings → Role Permissions` and confirm the role does not include `labs:create`, `labs:update`, `agents:create`, or `agents:update`.
  - Server-side permission enforcement exists; if UI hides a control but the API returns 403 on mutation, the backend is correctly enforcing permissions.

### 12. Settings (30 sec)
- [ ] Go to Settings
- [ ] Show clinic configuration
- [ ] Show GST settings
- [ ] Show working hours

---

## 💡 Key Features to Highlight

1. **Auto Patient ID**: P-0001, P-0002... automatic generation
2. **Smart Search**: Find patients by name/phone
3. **Quick Vitals Entry**: BP, Pulse, SpO2
4. **Medicine Integration**: Prescription directly linked to pharmacy
5. **GST Compliant**: CGST/SGST/IGST automatic calculation
6. **Multi-Role Access**: Different views for different roles
7. **WhatsApp Ready**: Bot integration for appointments
8. **Mobile Responsive**: Works on tablets/phones
9. **HIPAA Compliant**: Secure passwords, audit logs, encryption
10. **Cloud Ready**: Zero-touch AWS deployment

---

## 🔒 HIPAA Compliance Features

- **Password Policy**: 14+ characters, mixed case, numbers, special chars
- **Session Management**: Auto-logout, secure tokens
- **Audit Logging**: All actions logged with timestamps
- **Data Encryption**: SSL/TLS in transit, encrypted at rest
- **Access Control**: Role-based permissions
- **Secure Storage**: AWS Secrets Manager for credentials

---

## 🚀 AWS Deployment (Fully Automated)

### One-Time Setup
```powershell
# 1. Configure AWS CLI
aws configure

# 2. Setup GitHub secrets (run from project root)
.\scripts\setup-aws-github.ps1
```

### Deploy
Just push to main:
```bash
git push origin main
```

The pipeline automatically:
1. Creates all AWS infrastructure (first run)
2. Builds and tests the application
3. Deploys to EC2
4. Runs database migrations
5. Performs health checks

### Manual Triggers
Go to GitHub **Actions → AWS Full Automation → Run workflow**:
- `deploy` - Redeploy application
- `destroy` - Remove all infrastructure
- `infrastructure-only` - Update infra only

---

## 🎬 Recording Tips

1. **Resolution**: 1920x1080 preferred
2. **Browser**: Use Chrome in incognito (clean)
3. **Zoom**: Keep browser at 100%
4. **Mouse**: Move slowly, pause on important areas
5. **Voice**: Explain each action clearly
6. **Duration**: Keep video under 20 minutes

---

## ▶️ Quick Start Commands

```bash
# Terminal 1 - Start Backend
cd server
npm install
# Apply dev migrations and seed (development only)
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev

# Terminal 2 - Start Frontend
cd client  
npm run dev
```

Then open: http://localhost:5173

---

## 📱 WhatsApp Bot Demo Commands

If WhatsApp bot is configured:
- `/book` - Book appointment
- `/status` - Check appointment status
- `/prescription` - Get prescription PDF
- `/stock` - Check medicine stock
- `/report` - Daily OPD report

---

Happy Demo Recording! 🎉
