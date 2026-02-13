import request from 'supertest';
import jwt from 'jsonwebtoken';
import app, { prisma } from '../src/index.js';

jest.setTimeout(30000);

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Staff assignment endpoints', () => {
  let clinic, doctorA, doctorB, staffUser, staffRecord, adminUser, adminToken;

  test('setup clinic, doctors and staff', async () => {
    clinic = await prisma.clinic.create({ data: { name: 'Assign Clinic', phone: '001' } });

    doctorA = await prisma.user.create({ data: { email: 'da@test', phone: '9001', password: 'x', name: 'Doc A', role: 'DOCTOR', clinicId: clinic.id } });
    doctorB = await prisma.user.create({ data: { email: 'db@test', phone: '9002', password: 'x', name: 'Doc B', role: 'DOCTOR', clinicId: clinic.id } });

    const user = await prisma.user.create({ data: { email: 'staff1@test', phone: '9010', password: 'x', name: 'Staff One', role: 'STAFF', clinicId: clinic.id } });
    staffRecord = await prisma.staff.create({ data: { userId: user.id, employeeId: 'EMP-T1', designation: 'Nurse', department: 'Nursing', clinicId: clinic.id } });

    adminUser = await prisma.user.create({ data: { email: 'admin@test', phone: '9090', password: 'x', name: 'Admin', role: 'SUPER_ADMIN', clinicId: clinic.id } });
    adminToken = jwt.sign({ userId: adminUser.id }, process.env.JWT_SECRET);

    expect(clinic).toBeDefined();
    expect(doctorA).toBeDefined();
    expect(staffRecord).toBeDefined();
  });

  test('assign staff to doctor and verify via listing', async () => {
    // Assign staff to doctorA
    await request(app)
      .post(`/api/staff/${staffRecord.id}/assign-doctor`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ doctorId: doctorA.id })
      .expect(200);

    // Fetch staff list
    const res = await request(app)
      .get('/api/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const items = res.body.data || [];
    const s = items.find(i => i.id === staffRecord.id);
    expect(s).toBeDefined();
    // assignments should include doctorA
    const assignedDoctors = (s.assignments || []).map(a => a.doctorId || (a.doctor && a.doctor.id));
    expect(assignedDoctors).toContain(doctorA.id);
  });

  test('unassign staff from doctor', async () => {
    // Unassign
    await request(app)
      .delete(`/api/staff/${staffRecord.id}/assign-doctor`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ doctorId: doctorA.id })
      .expect(200);

    const res2 = await request(app)
      .get('/api/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const s2 = (res2.body.data || []).find(i => i.id === staffRecord.id);
    const assignedDoctors2 = (s2.assignments || []).map(a => a.doctorId || (a.doctor && a.doctor.id));
    expect(assignedDoctors2).not.toContain(doctorA.id);
  });
});
