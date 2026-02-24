import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'docclinic_token';
const REFRESH_KEY = 'docclinic_refresh';
const USER_KEY = 'docclinic_user';
const PROFILES_KEY = 'docclinic_patient_profiles';
const ACTIVE_PROFILE_KEY = 'docclinic_active_profile';
const MOCK_OTP_KEY_PREFIX = 'mock_otp_';
const SERVER_URL = 'https://docsyerp.in';

const MOCK_DEV = SERVER_URL === 'mock';

async function secureSet(key, value) {
  return AsyncStorage.setItem(key, value);
}
async function secureGet(key) {
  return AsyncStorage.getItem(key);
}
async function secureDelete(key) {
  return AsyncStorage.removeItem(key);
}

async function clearSessionState() {
  await secureDelete(TOKEN_KEY);
  await secureDelete(REFRESH_KEY);
  await AsyncStorage.removeItem(USER_KEY);
  await AsyncStorage.removeItem(PROFILES_KEY);
  await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
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
    await clearSessionState();
  },
  saveUser: async (user) => {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  getUser: async () => {
    const v = await AsyncStorage.getItem(USER_KEY);
    return v ? JSON.parse(v) : null;
  },
  savePatientProfiles: async (profiles = []) => {
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles || []));
  },
  getPatientProfiles: async () => {
    const v = await AsyncStorage.getItem(PROFILES_KEY);
    return v ? JSON.parse(v) : [];
  },
  setActiveProfile: async (profile) => {
    if (!profile) {
      await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
      return;
    }
    await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(profile));
  },
  getActiveProfile: async () => {
    const v = await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
    return v ? JSON.parse(v) : null;
  },
  getContextHeaders: async () => {
    const active = await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
    if (!active) return {};
    try {
      const profile = JSON.parse(active);
      const headers = {};
      if (profile?.clinicId) headers['x-clinic-id'] = String(profile.clinicId);
      if (profile?.id) headers['x-patient-id'] = String(profile.id);
      return headers;
    } catch (e) {
      return {};
    }
  },
  bootstrapPatientProfiles: async () => {
    const token = await secureGet(TOKEN_KEY);
    if (!token) return { profiles: [], defaultProfile: null };
    const res = await fetch(`${SERVER_URL}/api/auth/patient-profiles`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to load patient profiles');
    const json = await res.json();
    const profiles = json?.data?.profiles || [];
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    const defaultProfileId = json?.data?.defaultProfileId || (profiles[0]?.id || null);
    const defaultProfile = profiles.find((p) => p.id === defaultProfileId) || profiles[0] || null;
    if (defaultProfile) {
      await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(defaultProfile));
    }
    return { profiles, defaultProfile };
  },
  login: async (email, password) => {
    const res = await fetch(`${SERVER_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error('Login failed');
    const json = await res.json();
    if (json.token) {
      await secureSet(TOKEN_KEY, json.token);
      if (json.refreshToken) await secureSet(REFRESH_KEY, json.refreshToken);
      if (json.user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(json.user));
    }
    return json;
  },
  refreshToken: async () => {
    const refresh = await secureGet(REFRESH_KEY);
    if (!refresh) throw new Error('No refresh token');
    const res = await fetch(`${SERVER_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh })
    });
    if (!res.ok) throw new Error('Refresh failed');
    const json = await res.json();
    if (json.token) {
      await secureSet(TOKEN_KEY, json.token);
      if (json.refreshToken) await secureSet(REFRESH_KEY, json.refreshToken);
      if (json.user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(json.user));
    }
    return json;
  },
  logout: async () => {
    await clearSessionState();
  },
  requestOtp: async (mobile) => {
    if (MOCK_DEV) {
      const otp = '123456';
      await AsyncStorage.setItem(MOCK_OTP_KEY_PREFIX + mobile, otp);
      return { ok: true };
    }
    const url = `${SERVER_URL}/api/auth/request-otp`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile })
    });
    const text = await res.text().catch(() => '<no body>');
    if (!res.ok) throw new Error(`Request OTP failed: ${res.status} ${text}`);
    try { return JSON.parse(text); } catch (e) { return { ok: true, raw: text }; }
  },
  verifyOtp: async (mobile, otp) => {
    if (MOCK_DEV) {
      const stored = await AsyncStorage.getItem(MOCK_OTP_KEY_PREFIX + mobile);
      if (stored && stored === otp) {
        const token = 'mock-token';
        await secureSet(TOKEN_KEY, token);
        await AsyncStorage.removeItem(MOCK_OTP_KEY_PREFIX + mobile);
        return { token, user: { mobile } };
      }
      throw new Error('Invalid OTP');
    }
    const res = await fetch(`${SERVER_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, otp })
    });
    if (!res.ok) throw new Error('Verify OTP failed');
    const json = await res.json();
    if (json.token) {
      await secureSet(TOKEN_KEY, json.token);
      if (json.refreshToken) await secureSet(REFRESH_KEY, json.refreshToken);
      if (json.user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(json.user));
    }
    return json;
  }
};
