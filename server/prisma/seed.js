// DocClinic ERP - Demo Data Seed Script
  const products = await Promise.all([
    ensure('pharmacyProduct', { clinicId: clinic.id, code: 'PAR500' }, {
      code: 'PAR500',
      name: 'Paracetamol 500mg',
      genericName: 'Paracetamol',
      manufacturer: 'Cipla Ltd',
      category: 'Tablet',
      mrp: 25.00,
      purchasePrice: 18.00,
      sellingPrice: 22.00,
      gstPercent: 12,
      quantity: 500,
      minStock: 50,
      unit: 'strip',
      batchNumber: 'BT2024001',
      expiryDate: new Date('2026-06-30'),
      rackNumber: 'A1',
      clinicId: clinic.id
    }),
    ensure('pharmacyProduct', { clinicId: clinic.id, code: 'AMX500' }, {
      code: 'AMX500',
      name: 'Amoxicillin 500mg',
      genericName: 'Amoxicillin',
      manufacturer: 'Sun Pharma',
      category: 'Capsule',
      mrp: 85.00,
      purchasePrice: 60.00,
      sellingPrice: 75.00,
      gstPercent: 12,
      quantity: 200,
      minStock: 30,
      unit: 'strip',
      batchNumber: 'BT2024002',
      expiryDate: new Date('2025-12-31'),
      rackNumber: 'A2',
      clinicId: clinic.id
    }),
    ensure('pharmacyProduct', { clinicId: clinic.id, code: 'AZI500' }, {
      code: 'AZI500',
      name: 'Azithromycin 500mg',
      genericName: 'Azithromycin',
      manufacturer: 'Zydus',
      category: 'Tablet',
      mrp: 120.00,
      purchasePrice: 85.00,
      sellingPrice: 105.00,
      gstPercent: 12,
      quantity: 150,
      minStock: 25,
      unit: 'strip',
      batchNumber: 'BT2024003',
      expiryDate: new Date('2026-03-31'),
      rackNumber: 'A3',
      clinicId: clinic.id
    }),
    ensure('pharmacyProduct', { clinicId: clinic.id, code: 'OMEP20' }, {
      code: 'OMEP20',
      name: 'Omeprazole 20mg',
      genericName: 'Omeprazole',
      manufacturer: 'Dr Reddy\'s',
      category: 'Capsule',
      mrp: 65.00,
      purchasePrice: 45.00,
      sellingPrice: 58.00,
      gstPercent: 12,
      quantity: 300,
      minStock: 40,
      unit: 'strip',
      batchNumber: 'BT2024004',
      expiryDate: new Date('2026-09-30'),
      rackNumber: 'B1',
      clinicId: clinic.id
    }),
    ensure('pharmacyProduct', { clinicId: clinic.id, code: 'CETRIZ' }, {
      code: 'CETRIZ',
      name: 'Cetirizine 10mg',
      genericName: 'Cetirizine',
      manufacturer: 'Cipla Ltd',
      category: 'Tablet',
      mrp: 35.00,
      purchasePrice: 22.00,
      sellingPrice: 30.00,
      gstPercent: 12,
      quantity: 400,
      minStock: 50,
      unit: 'strip',
      batchNumber: 'BT2024005',
      expiryDate: new Date('2026-08-31'),
      rackNumber: 'B2',
      clinicId: clinic.id
    }),
    ensure('pharmacyProduct', { clinicId: clinic.id, code: 'METF500' }, {
      code: 'METF500',
      name: 'Metformin 500mg',
      genericName: 'Metformin',
      manufacturer: 'USV Ltd',
      category: 'Tablet',
      mrp: 45.00,
      purchasePrice: 30.00,
      sellingPrice: 40.00,
      gstPercent: 12,
      quantity: 250,
      minStock: 30,
      unit: 'strip',
      batchNumber: 'BT2024006',
      expiryDate: new Date('2026-05-31'),
      rackNumber: 'B3',
      clinicId: clinic.id
    }),
    ensure('pharmacyProduct', { clinicId: clinic.id, code: 'AMLOD5' }, {
      code: 'AMLOD5',
      name: 'Amlodipine 5mg',
      genericName: 'Amlodipine',
      manufacturer: 'Pfizer',
      category: 'Tablet',
      mrp: 55.00,
      purchasePrice: 38.00,
      sellingPrice: 48.00,
      gstPercent: 12,
      quantity: 180,
      minStock: 25,
      unit: 'strip',
      batchNumber: 'BT2024007',
      expiryDate: new Date('2026-07-31'),
      rackNumber: 'C1',
      clinicId: clinic.id
    }),
    ensure('pharmacyProduct', { clinicId: clinic.id, code: 'BCOMP' }, {
      code: 'BCOMP',
      name: 'B-Complex Syrup',
      genericName: 'Vitamin B Complex',
      manufacturer: 'Abbott',
      category: 'Syrup',
      mrp: 95.00,
      purchasePrice: 70.00,
      sellingPrice: 85.00,
      gstPercent: 12,
      quantity: 80,
      minStock: 15,
      unit: 'bottle',
      batchNumber: 'BT2024008',
      expiryDate: new Date('2025-10-31'),
      rackNumber: 'D1',
      clinicId: clinic.id
    }),
    ensure('pharmacyProduct', { clinicId: clinic.id, code: 'DICLO50' }, {
      code: 'DICLO50',
      name: 'Diclofenac 50mg',
      genericName: 'Diclofenac Sodium',
      manufacturer: 'Novartis',
      category: 'Tablet',
      mrp: 40.00,
      purchasePrice: 28.00,
      sellingPrice: 35.00,
      gstPercent: 12,
      quantity: 8, // LOW STOCK!
      minStock: 20,
      unit: 'strip',
      batchNumber: 'BT2024009',
      expiryDate: new Date('2026-04-30'),
      rackNumber: 'C2',
      clinicId: clinic.id
    }),
    ensure('pharmacyProduct', { clinicId: clinic.id, code: 'COUGH' }, {
      code: 'COUGH',
      name: 'Cough Syrup',
      genericName: 'Dextromethorphan',
      manufacturer: 'Himalaya',
      category: 'Syrup',
      mrp: 75.00,
      purchasePrice: 55.00,
      sellingPrice: 68.00,
      gstPercent: 12,
      quantity: 25,
      minStock: 10,
      unit: 'bottle',
      batchNumber: 'BT2023010',
      expiryDate: new Date('2026-03-15'), // Expiring soon!
      rackNumber: 'D2',
      clinicId: clinic.id
    })
  ]);
  console.log(`   ✅ Ensured ${products.length} pharmacy products`);
  
  const patients = await Promise.all([
    prisma.patient.upsert({
      where: { patientId: 'P-0001' },
      update: {},
      create: {
        patientId: 'P-0001',
        name: 'Rahul Mehta',
        phone: '9898989801',
        email: 'rahul.mehta@email.com',
        gender: 'MALE',
        dateOfBirth: new Date('1985-05-15'),
        age: 40,
        bloodGroup: 'B+',
        address: '45, Green Park, Sector 22',
        city: 'Noida',
        allergies: JSON.stringify(['Penicillin']),
        medicalHistory: JSON.stringify({
          conditions: ['Hypertension'],
          surgeries: [],
          familyHistory: ['Diabetes (Father)']
        }),
        clinicId: clinic.id
      }
    }),
    prisma.patient.upsert({
      where: { patientId: 'P-0002' },
      update: {},
      create: {
        patientId: 'P-0002',
        name: 'Sunita Devi',
        phone: '9898989802',
        gender: 'FEMALE',
        dateOfBirth: new Date('1990-08-20'),
        age: 35,
        bloodGroup: 'O+',
        address: '12, Vasant Kunj',
        city: 'Delhi',
        allergies: JSON.stringify([]),
        clinicId: clinic.id
      }
    }),
    prisma.patient.upsert({
      where: { patientId: 'P-0003' },
      update: {},
      create: {
        patientId: 'P-0003',
        name: 'Vikram Singh',
        phone: '9898989803',
        gender: 'MALE',
        dateOfBirth: new Date('1978-12-10'),
        age: 47,
        bloodGroup: 'A+',
        address: '78, Model Town',
        city: 'Ghaziabad',
        allergies: JSON.stringify(['Sulfa drugs']),
        medicalHistory: JSON.stringify({
          conditions: ['Type 2 Diabetes', 'High Cholesterol'],
          medications: ['Metformin 500mg']
        }),
        clinicId: clinic.id
      }
    }),
    prisma.patient.upsert({
      where: { patientId: 'P-0004' },
      update: {},
      create: {
        patientId: 'P-0004',
        name: 'Anjali Kapoor',
        phone: '9898989804',
        gender: 'FEMALE',
        dateOfBirth: new Date('1995-03-25'),
        age: 30,
        bloodGroup: 'AB+',
        address: '23, Raj Nagar',
        city: 'Noida',
        clinicId: clinic.id
      }
    }),
    prisma.patient.upsert({
      where: { patientId: 'P-0005' },
      update: {},
      create: {
        patientId: 'P-0005',
        name: 'Mohan Lal',
        phone: '9898989805',
        gender: 'MALE',
        dateOfBirth: new Date('1960-07-08'),
        age: 65,
        bloodGroup: 'B-',
        address: '56, Sector 18',
        city: 'Noida',
        allergies: JSON.stringify(['Aspirin']),
        medicalHistory: JSON.stringify({
          conditions: ['Arthritis', 'Hypertension'],
          surgeries: ['Knee replacement (2020)']
        }),
        clinicId: clinic.id
      }
    })
  ]);
  console.log(`   ✅ Ensured ${patients.length} patients`);

  // Add vitals for patients
  for (const patient of patients) {
    const existing = await prisma.patientVital.findFirst({ where: { patientId: patient.id } });
    if (!existing) {
      await prisma.patientVital.create({
        data: {
          patientId: patient.id,
          weight: 65 + Math.random() * 20,
          height: 160 + Math.random() * 20,
          bloodPressure: `${110 + Math.floor(Math.random() * 30)}/${70 + Math.floor(Math.random() * 20)}`,
          pulse: 70 + Math.floor(Math.random() * 20),
          temperature: 98.4 + Math.random() * 0.8,
          spO2: 96 + Math.floor(Math.random() * 3)
        }
      });
    }
  }
  console.log(`   ✅ Added vitals for all patients`);
  // pharmacy products handled earlier

  // ==========================================
  // 5. CREATE LABS
  // ==========================================
  console.log('\n🔬 Creating labs...');
  
  const labs = await Promise.all([
    ensure('lab', { clinicId: clinic.id, name: 'PathCare Diagnostics' }, {
      name: 'PathCare Diagnostics',
      address: 'Sector 18, Noida',
      phone: '9876500001',
      email: 'pathcare@email.com',
      contactPerson: 'Dr. Sanjay',
      commissionType: 'PERCENTAGE',
      commissionValue: 15,
      clinicId: clinic.id
    }),
    ensure('lab', { clinicId: clinic.id, name: 'LifeLine Labs' }, {
      name: 'LifeLine Labs',
      address: 'Greater Noida',
      phone: '9876500002',
      email: 'lifeline@email.com',
      contactPerson: 'Mr. Rakesh',
      commissionType: 'PERCENTAGE',
      commissionValue: 12,
      clinicId: clinic.id
    })
  ]);
  console.log(`   ✅ Ensured ${labs.length} labs`);

  // ==========================================
  // 6. CREATE AGENTS
  // ==========================================
  console.log('\n🤝 Creating agents...');
  
  const agents = await Promise.all([
    ensure('agent', { clinicId: clinic.id, name: 'Suresh Medical Agency' }, {
      name: 'Suresh Medical Agency',
      phone: '9876600001',
      email: 'suresh@agency.com',
      commissionType: 'PERCENTAGE',
      commissionValue: 10,
      discountAllowed: 5,
      clinicId: clinic.id
    }),
    ensure('agent', { clinicId: clinic.id, name: 'Ravi Healthcare' }, {
      name: 'Ravi Healthcare',
      phone: '9876600002',
      email: 'ravi@healthcare.com',
      commissionType: 'FIXED',
      commissionValue: 50,
      discountAllowed: 3,
      clinicId: clinic.id
    })
  ]);
  console.log(`   ✅ Ensured ${agents.length} agents`);

  // ==========================================
  // 7. CREATE APPOINTMENTS (Today & Historical)
  // ==========================================
  console.log('\n📅 Creating appointments...');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const appointments = await Promise.all([
    ensure('appointment', { appointmentNo: 'A-0001' }, {
      appointmentNo: 'A-0001',
      date: today,
      timeSlot: '09:00-09:15',
      type: 'CONSULTATION',
      status: 'COMPLETED',
      symptoms: 'Fever and headache for 2 days',
      consultationFee: 500,
      patientId: patients[0].id,
      clinicId: clinic.id,
      bookedVia: 'WEB'
    }),
    ensure('appointment', { appointmentNo: 'A-0002' }, {
      appointmentNo: 'A-0002',
      date: today,
      timeSlot: '09:30-09:45',
      type: 'CONSULTATION',
      status: 'COMPLETED',
      symptoms: 'Regular checkup',
      consultationFee: 500,
      patientId: patients[1].id,
      clinicId: clinic.id,
      bookedVia: 'WHATSAPP'
    }),
    ensure('appointment', { appointmentNo: 'A-0003' }, {
      appointmentNo: 'A-0003',
      date: today,
      timeSlot: '10:00-10:15',
      type: 'FOLLOW_UP',
      status: 'IN_PROGRESS',
      symptoms: 'Diabetes follow-up',
      consultationFee: 300,
      patientId: patients[2].id,
      clinicId: clinic.id,
      bookedVia: 'WEB'
    }),
    ensure('appointment', { appointmentNo: 'A-0004' }, {
      appointmentNo: 'A-0004',
      date: today,
      timeSlot: '10:30-10:45',
      type: 'CONSULTATION',
      status: 'IN_QUEUE',
      symptoms: 'Throat pain and cough',
      consultationFee: 500,
      patientId: patients[3].id,
      clinicId: clinic.id,
      bookedVia: 'WALK_IN'
    }),
    ensure('appointment', { appointmentNo: 'A-0005' }, {
      appointmentNo: 'A-0005',
      date: today,
      timeSlot: '11:00-11:15',
      type: 'CONSULTATION',
      status: 'SCHEDULED',
      symptoms: 'Joint pain',
      consultationFee: 500,
      patientId: patients[4].id,
      clinicId: clinic.id,
      bookedVia: 'WHATSAPP'
    })
  ]);
  console.log(`   ✅ Ensured ${appointments.length} appointments for today`);

  // ==========================================
  // 8. CREATE PRESCRIPTIONS
  // ==========================================
  console.log('\n📋 Creating prescriptions...');
  
  const prescription1 = await ensure('prescription', { prescriptionNo: 'RX-0001' }, {
    prescriptionNo: 'RX-0001',
    patientId: patients[0].id,
    clinicId: clinic.id,
    appointmentId: appointments[0].id,
    diagnosis: JSON.stringify(['Viral Fever', 'Acute Pharyngitis']),
    symptoms: JSON.stringify(['Fever', 'Headache', 'Body ache']),
    clinicalNotes: 'Patient presents with high-grade fever. Throat mildly inflamed.',
    advice: 'Take rest. Drink plenty of fluids. Avoid cold beverages.',
    followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    vitalsSnapshot: JSON.stringify({
      bp: '120/80',
      pulse: 88,
      temp: 101.2
    }),
    medicines: {
      create: [
        {
          medicineName: 'Paracetamol 500mg',
          genericName: 'Paracetamol',
          dosage: '500mg',
          frequency: '1-1-1',
          duration: '3 days',
          timing: 'After food',
          quantity: 9,
          productId: products[0].id
        },
        {
          medicineName: 'Cetirizine 10mg',
          genericName: 'Cetirizine',
          dosage: '10mg',
          frequency: '0-0-1',
          duration: '5 days',
          timing: 'At bedtime',
          quantity: 5,
          productId: products[4].id
        }
      ]
    }
  });

  const prescription2 = await ensure('prescription', { prescriptionNo: 'RX-0002' }, {
    prescriptionNo: 'RX-0002',
    patientId: patients[1].id,
    clinicId: clinic.id,
    appointmentId: appointments[1].id,
    diagnosis: JSON.stringify(['General Checkup - Normal']),
    symptoms: JSON.stringify(['None']),
    clinicalNotes: 'Routine health checkup. All parameters normal.',
    advice: 'Maintain healthy diet and regular exercise.',
    vitalsSnapshot: JSON.stringify({
      bp: '118/76',
      pulse: 72,
      temp: 98.4
    }),
    medicines: {
      create: [
        {
          medicineName: 'B-Complex Syrup',
          genericName: 'Vitamin B Complex',
          dosage: '10ml',
          frequency: '1-0-1',
          duration: '30 days',
          timing: 'After food',
          quantity: 1,
          productId: products[7].id
        }
      ]
    }
  });
  console.log(`   ✅ Ensured 2 prescriptions`);

  // ==========================================
  // 9. CREATE BILLS
  // ==========================================
  console.log('\n💰 Creating bills...');
  
  const bills = await Promise.all([
    ensure('bill', { billNo: 'BILL-0001' }, {
      billNo: 'BILL-0001',
      type: 'CONSULTATION',
      patientId: patients[0].id,
      clinicId: clinic.id,
      subtotal: 500,
      taxAmount: 0,
      totalAmount: 500,
      paidAmount: 500,
      dueAmount: 0,
      paymentStatus: 'PAID',
      paymentMethod: 'UPI',
      items: {
        create: [{
          description: 'Consultation Fee',
          quantity: 1,
          unitPrice: 500,
          amount: 500
        }]
      }
    }),
    ensure('bill', { billNo: 'BILL-0002' }, {
      billNo: 'BILL-0002',
      type: 'PHARMACY',
      patientId: patients[0].id,
      clinicId: clinic.id,
      subtotal: 252,
      discountPercent: 5,
      discountAmount: 12.60,
      taxAmount: 28.73,
      totalAmount: 268.13,
      paidAmount: 268.13,
      dueAmount: 0,
      paymentStatus: 'PAID',
      paymentMethod: 'CASH',
      taxBreakdown: JSON.stringify({ cgst: 14.36, sgst: 14.36 }),
      items: {
        create: [
          {
            description: 'Paracetamol 500mg x 1 strip',
            quantity: 1,
            unitPrice: 22,
            gstPercent: 12,
            amount: 22,
            productId: products[0].id
          },
          {
            description: 'Cetirizine 10mg x 1 strip',
            quantity: 1,
            unitPrice: 30,
            gstPercent: 12,
            amount: 30,
            productId: products[4].id
          }
        ]
      }
    }),
    ensure('bill', { billNo: 'BILL-0003' }, {
      billNo: 'BILL-0003',
      type: 'LAB_TEST',
      patientId: patients[2].id,
      clinicId: clinic.id,
      labId: labs[0].id,
      subtotal: 1200,
      taxAmount: 0,
      totalAmount: 1200,
      paidAmount: 600,
      dueAmount: 600,
      paymentStatus: 'PARTIAL',
      paymentMethod: 'CASH',
      items: {
        create: [
          {
            description: 'Complete Blood Count (CBC)',
            quantity: 1,
            unitPrice: 400,
            amount: 400
          },
          {
            description: 'HbA1c Test',
            quantity: 1,
            unitPrice: 500,
            amount: 500
          },
          {
            description: 'Lipid Profile',
            quantity: 1,
            unitPrice: 300,
            amount: 300
          }
        ]
      }
    })
  ]);
  console.log(`   ✅ Ensured ${bills.length} bills`);

  // Create commission record for lab bill
  await ensure('commissionRecord', { labId: labs[0].id, billAmount: 1200 }, {
    labId: labs[0].id,
    amount: 180, // 15% of 1200
    billAmount: 1200,
    rate: 15,
    status: 'PENDING'
  });
  console.log(`   ✅ Ensured commission records`);

  // ==========================================
  // 10. CREATE PAYMENTS
  // ==========================================
  console.log('\n💳 Creating payment records...');
  
  await ensure('payment', { billId: bills[0].id, amount: 500 }, {
    billId: bills[0].id,
    clinicId: clinic.id,
    amount: 500,
    method: 'UPI',
    reference: 'UPI123456789'
  });

  await ensure('payment', { billId: bills[1].id, amount: 268.13 }, {
    billId: bills[1].id,
    clinicId: clinic.id,
    amount: 268.13,
    method: 'CASH'
  });

  await ensure('payment', { billId: bills[2].id, amount: 600 }, {
    billId: bills[2].id,
    clinicId: clinic.id,
    amount: 600,
    method: 'CASH',
    notes: 'Partial payment - balance ₹600 pending'
  });
  console.log(`   ✅ Ensured payment records`);

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log('\n' + '='.repeat(50));
  console.log('🎉 DEMO DATA SEEDING COMPLETE!');
  console.log('='.repeat(50));
  console.log('\n📊 Summary:');
  console.log(`   • 1 Clinic: ${clinic.name}`);
  console.log(`   • 4 Users (Doctor, Receptionist, Pharmacist, Accountant)`);
  console.log(`   • ${patients.length} Patients with vitals`);
  console.log(`   • ${products.length} Pharmacy Products`);
  console.log(`   • ${labs.length} Labs`);
  console.log(`   • ${agents.length} Agents`);
  console.log(`   • ${appointments.length} Today's Appointments`);
  console.log(`   • 2 Prescriptions`);
  console.log(`   • ${bills.length} Bills`);
  
  console.log('\n🔐 Login Credentials:');
  console.log('   Doctor:       doctor@demo.com / demo123');
  console.log('   Receptionist: receptionist@demo.com / demo123');
  console.log('   Pharmacist:   pharmacist@demo.com / demo123');
  console.log('   Accountant:   accountant@demo.com / demo123');
  
  console.log('\n✅ Ready for demo!\n');


main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
