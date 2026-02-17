import IORedis from 'ioredis';
import { logger } from '../config/logger.js';

// For now, disable Redis and use in-memory store to simplify development.
// If you want to enable Redis later, set REDIS_URL and re-enable the code below.
const REDIS_URL = process.env.REDIS_URL || '';
let redis = null;
if (false && REDIS_URL) {
  redis = new IORedis(REDIS_URL);
  redis.on('error', (e) => logger.error('Redis error', e));
}

// In-memory fallback for development when Redis not configured
const memStore = new Map();

const OTP_KEY = (m) => `otp:${m}`;
const OTP_COUNT_KEY = (m) => `otpcount:${m}`;
const OTP_LAST_KEY = (m) => `otplast:${m}`;

function genOtp(){
  // 4-digit OTP
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function requestOtp(mobile){
  const now = Date.now();
  if(redis){
    // lastSent check (60s)
    const last = await redis.get(OTP_LAST_KEY(mobile));
    if(last) throw new Error('Please wait before requesting another OTP');

    // hourly count
    const count = await redis.incr(OTP_COUNT_KEY(mobile));
    if(count === 1) await redis.expire(OTP_COUNT_KEY(mobile), 60 * 60);
    if(count > 20) throw new Error('Too many OTP requests for this number');

    // throttle key for 60s
    await redis.set(OTP_LAST_KEY(mobile), '1', 'EX', 60);

    const otp = genOtp();
    await redis.set(OTP_KEY(mobile), otp, 'EX', 5 * 60); // 5 minutes
    console.log(`[OTP service] generated OTP for ${mobile}: ${otp} (redis)`);
    return { code: otp };
  }

  // mem fallback
  const rec = memStore.get(mobile) || { count: 0, lastSent: 0 };
  if(rec.lastSent && now - rec.lastSent < 60 * 1000) throw new Error('Please wait before requesting another OTP');
  if(rec.lastSent && now - rec.lastSent > 60 * 60 * 1000) rec.count = 0;
  if(rec.count >= 20) throw new Error('Too many OTP requests for this number');
  const otp = genOtp();
  memStore.set(mobile, { code: otp, expiresAt: now + (5*60*1000), count: rec.count + 1, lastSent: now });
  console.log(`[OTP service] generated OTP for ${mobile}: ${otp} (mem)`);
  return { code: otp };
}

export async function verifyOtp(mobile, otp){
  if(redis){
    const stored = await redis.get(OTP_KEY(mobile));
    const ok = !!stored && stored === otp;
    console.log(`[OTP service] verify attempt for ${mobile} (redis) stored=${stored} provided=${otp} ok=${ok}`);
    if(!ok) return false;
    await redis.del(OTP_KEY(mobile));
    return true;
  }

  const rec = memStore.get(mobile);
  const ok = !!rec && rec.expiresAt >= Date.now() && rec.code === otp;
  console.log(`[OTP service] verify attempt for ${mobile} (mem) stored=${rec?.code || null} provided=${otp} ok=${ok}`);
  if(!rec) return false;
  if(rec.expiresAt < Date.now()) { memStore.delete(mobile); return false; }
  if(rec.code !== otp) return false;
  memStore.delete(mobile);
  return true;
}

export async function getOtpForDebug(mobile){
  if(redis){
    return redis.get(OTP_KEY(mobile));
  }
  const rec = memStore.get(mobile);
  return rec ? rec.code : null;
}
