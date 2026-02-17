import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'docclinic_token';
const REFRESH_KEY = 'docclinic_refresh';
const USER_KEY = 'docclinic_user';
const MOCK_OTP_KEY_PREFIX = 'mock_otp_';
const SERVER_URL = 'https://docsyerp.in'; // replace with your backend or 'mock' for dev

const MOCK_DEV = SERVER_URL === 'mock';

async function secureSet(key, value){
  return AsyncStorage.setItem(key, value);
}
async function secureGet(key){
  return AsyncStorage.getItem(key);
}
async function secureDelete(key){
  return AsyncStorage.removeItem(key);
}

export default {
  saveToken: async (token) => {
    await secureSet(TOKEN_KEY, token);
  },
  getToken: async () => {
    return secureGet(TOKEN_KEY);
  },
  saveRefreshToken: async (t) => { await secureSet(REFRESH_KEY, t); },
  getRefreshToken: async () => { return secureGet(REFRESH_KEY); },
  removeToken: async () => {
    await secureDelete(TOKEN_KEY);
    await secureDelete(REFRESH_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  },
  saveUser: async (user) => {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  getUser: async () => {
    const v = await AsyncStorage.getItem(USER_KEY);
    return v ? JSON.parse(v) : null;
  },
  login: async (email, password) => {
    const res = await fetch(`${SERVER_URL}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if(!res.ok) throw new Error('Login failed');
    const json = await res.json();
    if(json.token){
      await secureSet(TOKEN_KEY, json.token);
      if(json.refreshToken) await secureSet(REFRESH_KEY, json.refreshToken);
      if(json.user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(json.user));
    }
    return json;
  },
  refreshToken: async () => {
    const refresh = await secureGet(REFRESH_KEY);
    if(!refresh) throw new Error('No refresh token');
    const res = await fetch(`${SERVER_URL}/api/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: refresh }) });
    if(!res.ok) throw new Error('Refresh failed');
    const json = await res.json();
    if(json.token){
      await secureSet(TOKEN_KEY, json.token);
      if(json.refreshToken) await secureSet(REFRESH_KEY, json.refreshToken);
      if(json.user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(json.user));
    }
    return json;
  },
  logout: async () => {
    await secureDelete(TOKEN_KEY);
    await secureDelete(REFRESH_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  },
  requestOtp: async (mobile) => {
    if(MOCK_DEV){
      const otp = '123456';
      await AsyncStorage.setItem(MOCK_OTP_KEY_PREFIX + mobile, otp);
      console.log('MOCK OTP for', mobile, otp);
      return { ok: true };
    }
    const url = `${SERVER_URL}/api/auth/request-otp`;
    try {
      console.log('[AUTH DEBUG] requestOtp ->', url, 'mobile=', mobile);
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile }) });
      const text = await res.text().catch(() => '<no body>');
      console.log('[AUTH DEBUG] requestOtp response', res.status, text);
      if(!res.ok) throw new Error('Request OTP failed: ' + res.status + ' ' + text);
      // try parse json
      try { return JSON.parse(text); } catch (e) { return { ok: true, raw: text }; }
    } catch (err) {
      console.error('[AUTH ERROR] requestOtp failed', err);
      throw err;
    }
  },
  verifyOtp: async (mobile, otp) => {
    if(MOCK_DEV){
      const stored = await AsyncStorage.getItem(MOCK_OTP_KEY_PREFIX + mobile);
      if(stored && stored === otp) {
        const token = 'mock-token';
        await secureSet(TOKEN_KEY, token);
        await AsyncStorage.removeItem(MOCK_OTP_KEY_PREFIX + mobile);
        return { token, user: { mobile } };
      }
      throw new Error('Invalid OTP');
    }
    const res = await fetch(`${SERVER_URL}/api/auth/verify-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile, otp }) });
    if(!res.ok) throw new Error('Verify OTP failed');
    const json = await res.json();
    if(json.token){
      await secureSet(TOKEN_KEY, json.token);
      if(json.refreshToken) await secureSet(REFRESH_KEY, json.refreshToken);
      if(json.user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(json.user));
    }
    return json;
  }
};
