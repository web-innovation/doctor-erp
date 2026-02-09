# DocClinic ERP - KT (Knowledge Transfer) Demo Guide

## 🎥 Demo Video Script

This guide walks through all features for recording a demo/KT video.

---

## 🔐 Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Doctor | doctor@demo.com | demo123 |
| Receptionist | receptionist@demo.com | demo123 |
| Pharmacist | pharmacist@demo.com | demo123 |
| Accountant | accountant@demo.com | demo123 |

---

## 📋 Demo Flow (15-20 mins)

### 1. Landing Page (1 min)
- [ ] Open http://localhost:5173
- [ ] Show the landing page features
- [ ] Click "Login" button

### 2. Login as Doctor (30 sec)
- [ ] Enter: doctor@demo.com / demo123
- [ ] Click Login

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
9. **Offline First**: SQLite for reliable local operation
10. **Cloud Ready**: Can deploy to AWS easily

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
