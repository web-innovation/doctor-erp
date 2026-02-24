import auth from './auth';
const SERVER_URL = 'https://docsyerp.in'; // replace with your server URL

async function fetchWithAuth(path, opts = {}){
  const token = await auth.getToken();
  const contextHeaders = await auth.getContextHeaders();
  const headers = Object.assign({ 'Content-Type': 'application/json' }, contextHeaders, opts.headers || {});
  if(token) headers['Authorization'] = `Bearer ${token}`;
  const fullUrl = `${SERVER_URL}${path}`;
  try {
    const method = (opts && opts.method) || 'GET';
    const bodyPreview = opts && opts.body ? ` body=${String(opts.body).slice(0,200)}` : '';
    console.log('[API DEBUG] fetching:', method, fullUrl, bodyPreview);
  } catch (e) {}
  const res = await fetch(fullUrl, Object.assign({}, opts, { headers }));
  if(res.status === 401){
    // try refresh once
    try{
      await auth.refreshToken();
      const token2 = await auth.getToken();
      const contextHeaders2 = await auth.getContextHeaders();
      const headers2 = Object.assign({ 'Content-Type': 'application/json' }, contextHeaders2, opts.headers || {});
      if(token2) headers2['Authorization'] = `Bearer ${token2}`;
      const res2 = await fetch(`${SERVER_URL}${path}`, Object.assign({}, opts, { headers: headers2 }));
      if(!res2.ok) {
        const t2 = await res2.text().catch(() => '<no body>');
        console.error('[API ERROR] refresh attempt failed', res2.status, t2);
        throw new Error('Network error');
      }
      const j2 = await res2.json();
      if (j2 && typeof j2 === 'object') {
        if ('pagination' in j2) return j2; // return full object for paginated endpoints
        if ('data' in j2) return j2.data;
      }
      return j2;
    }catch(e){
      throw new Error('Unauthorized');
    }
  }
  if(!res.ok){
    const txt = await res.text().catch(() => '<no body>');
    console.error('[API ERROR] request failed', res.status, txt);
    throw new Error('Network error');
  }
  const j = await res.json();
  if (j && typeof j === 'object') {
    if ('pagination' in j) return j;
    if ('data' in j) return j.data;
  }
  return j;
}

async function withPatientContextQuery(basePath, page = 1, limit = 20) {
  const active = await auth.getActiveProfile();
  const params = new URLSearchParams();
  params.set('patientId', 'me');
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (active?.clinicId) params.set('clinicId', String(active.clinicId));
  if (active?.id) params.set('patientProfileId', String(active.id));
  return `${basePath}?${params.toString()}`;
}

export default {
  getBills: async (_patientId, page = 1, limit = 20) => fetchWithAuth(await withPatientContextQuery('/api/billing', page, limit)),
  getPrescriptions: async (_patientId, page = 1, limit = 20) => fetchWithAuth(await withPatientContextQuery('/api/prescriptions', page, limit)),
  getPrescription: async (id) => {
    const active = await auth.getActiveProfile();
    const q = new URLSearchParams();
    if (active?.clinicId) q.set('clinicId', String(active.clinicId));
    if (active?.id) q.set('patientProfileId', String(active.id));
    const suffix = q.toString() ? `?${q.toString()}` : '';
    return fetchWithAuth(`/api/prescriptions/${id}${suffix}`);
  },
  getAppointments: async (_patientId, page = 1, limit = 20) => fetchWithAuth(await withPatientContextQuery('/api/appointments', page, limit)),
  getAppointment: async (id) => {
    const active = await auth.getActiveProfile();
    const q = new URLSearchParams();
    if (active?.clinicId) q.set('clinicId', String(active.clinicId));
    if (active?.id) q.set('patientProfileId', String(active.id));
    const suffix = q.toString() ? `?${q.toString()}` : '';
    return fetchWithAuth(`/api/appointments/${id}${suffix}`);
  },
  updateAppointmentStatus: (id, status) => fetchWithAuth(`/api/appointments/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getBill: async (id) => {
    const active = await auth.getActiveProfile();
    const q = new URLSearchParams();
    if (active?.clinicId) q.set('clinicId', String(active.clinicId));
    if (active?.id) q.set('patientProfileId', String(active.id));
    const suffix = q.toString() ? `?${q.toString()}` : '';
    return fetchWithAuth(`/api/billing/${id}${suffix}`);
  },
  getDoctors: async () => {
    const active = await auth.getActiveProfile();
    const q = new URLSearchParams();
    if (active?.clinicId) q.set('clinicId', String(active.clinicId));
    const suffix = q.toString() ? `?${q.toString()}` : '';
    return fetchWithAuth(`/api/appointments/doctors${suffix}`);
  },
  bookAppointment: async (payload) => {
    const active = await auth.getActiveProfile();
    const body = Object.assign({}, payload);
    if (active?.clinicId) body.clinicId = active.clinicId;
    if (active?.id) body.patientProfileId = active.id;
    return fetchWithAuth(`/api/appointments`, { method: 'POST', body: JSON.stringify(body) });
  },
  getPatientProfiles: () => fetchWithAuth('/api/auth/patient-profiles'),
  switchProfile: async (profile) => {
    await auth.setActiveProfile(profile);
    return profile;
  },
  login: (email, password) => auth.login(email, password)
};
