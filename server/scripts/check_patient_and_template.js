#!/usr/bin/env node
/**
 * Check patient/user by phone and whether OTP email template exists for their clinic
 * Usage: node scripts/check_patient_and_template.js 8284073790
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(){
  const phone = process.argv[2];
  if(!phone){
    console.error('Usage: node scripts/check_patient_and_template.js <phone>');
    process.exit(1);
  }

  console.log('Searching for patient with phone =', phone);
  const patient = await prisma.patient.findFirst({ where: { phone } });
  if(patient){
    console.log('Patient found:', { id: patient.id, patientId: patient.patientId, name: patient.name, email: patient.email, clinicId: patient.clinicId });
  } else {
    console.log('No patient found with that phone');
  }

  console.log('Searching for user with phone =', phone);
  const user = await prisma.user.findFirst({ where: { phone } });
  if(user){
    console.log('User found:', { id: user.id, email: user.email, name: user.name, clinicId: user.clinicId });
  } else {
    console.log('No user found with that phone');
  }

  const clinicId = (patient && patient.clinicId) || (user && user.clinicId);
  if(!clinicId){
    console.log('No clinicId associated with this phone; cannot check clinic OTP template.');
    process.exit(0);
  }

  console.log('Checking clinic settings for clinicId =', clinicId);
  const tpl = await prisma.clinicSettings.findFirst({ where: { clinicId, key: 'otp_email_template' } });
  if(tpl && tpl.value){
    console.log('Found otp_email_template for clinic. Template (truncated 400 chars):');
    console.log(tpl.value.slice(0,400));
  } else {
    console.log('No otp_email_template found for clinic');
  }

  process.exit(0);
}

main().catch((e)=>{ console.error(e); process.exit(2); });
