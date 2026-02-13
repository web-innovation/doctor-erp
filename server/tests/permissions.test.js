import request from 'supertest';
import jwt from 'jsonwebtoken';
import app, { prisma } from '../src/index.js';

jest.setTimeout(30000);

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  await prisma.$connect();
  // Clean test data (be careful in dev DB)
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Doctor-scoped data access', () => {
  let clinic, doctor1, doctor2, patient1, rx1, rx2, tokenDoc1;

  test('setup clinic, doctors, patient and prescriptions', async () => {
    clinic = await prisma.clinic.create({ data: { name: 'Test Clinic', phone: '000' } });

    // create two doctor users
    doctor1 = await prisma.user.create({ data: { email: 'doc1@test', phone: '9001', password: 'x', name: 'Doc One', role: 'DOCTOR', clinicId: clinic.id } });
    doctor2 = await prisma.user.create({ data: { email: 'doc2@test', phone: '9002', password: 'x', name: 'Doc Two', role: 'DOCTOR', clinicId: clinic.id } });

    // create patient assigned to doctor1
    patient1 = await prisma.patient.create({ data: { patientId: 'P-T1', name: 'Patient One', phone: '999', clinicId: clinic.id, primaryDoctorId: doctor1.id } });

    // create prescriptions: one for doctor1, one for doctor2
    rx1 = await prisma.prescription.create({ data: { prescriptionNo: 'RX-T1', clinicId: clinic.id, patientId: patient1.id, doctorId: doctor1.id } });
    rx2 = await prisma.prescription.create({ data: { prescriptionNo: 'RX-T2', clinicId: clinic.id, patientId: patient1.id, doctorId: doctor2.id } });

    tokenDoc1 = jwt.sign({ userId: doctor1.id }, process.env.JWT_SECRET);

    expect(clinic).toBeDefined();
    expect(doctor1).toBeDefined();
  });

  test('doctor should only see own prescriptions', async () => {
    const res = await request(app)
      .get('/api/prescriptions')
      .set('Authorization', `Bearer ${tokenDoc1}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const items = res.body.data || [];
    // should contain only rx1
    const ids = items.map(i => i.id);
    expect(ids).toContain(rx1.id);
    expect(ids).not.toContain(rx2.id);
  });
});
