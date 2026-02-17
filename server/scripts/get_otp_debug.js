#!/usr/bin/env node
/**
 * Get stored OTP for a key (mobile or email) using otpService.getOtpForDebug
 * Usage: node scripts/get_otp_debug.js 8284073790
 */
import { getOtpForDebug } from '../src/services/otpService.js';

async function main(){
  const key = process.argv[2];
  if(!key){
    console.error('Usage: node scripts/get_otp_debug.js <mobile_or_email>');
    process.exit(1);
  }

  try{
    const otp = await getOtpForDebug(key);
    console.log('Stored OTP for', key, '=>', otp);
  }catch(err){
    console.error('Error reading OTP:', err.message || err);
    process.exit(2);
  }
  process.exit(0);
}

main();
