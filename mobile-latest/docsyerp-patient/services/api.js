import auth from './auth';
const SERVER_URL = 'https://docsyerp.in'; // replace with your server URL

async function fetchWithAuth(path, opts = {}){
  const token = await auth.getToken();
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
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
      const headers2 = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
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

export default {
  getBills: (patientId, page = 1, limit = 20) => fetchWithAuth(`/api/billing?patientId=${patientId}&page=${page}&limit=${limit}`),
  getPrescriptions: (patientId, page = 1, limit = 20) => fetchWithAuth(`/api/prescriptions?patientId=${patientId}&page=${page}&limit=${limit}`),
  getPrescription: (id) => fetchWithAuth(`/api/prescriptions/${id}`),
  getAppointments: (patientId, page = 1, limit = 20) => fetchWithAuth(`/api/appointments?patientId=${patientId}&page=${page}&limit=${limit}`),
  getAppointment: (id) => fetchWithAuth(`/api/appointments/${id}`),
  updateAppointmentStatus: (id, status) => fetchWithAuth(`/api/appointments/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getBill: (id) => fetchWithAuth(`/api/billing/${id}`),
  getDoctors: () => fetchWithAuth(`/api/appointments/doctors`),
  bookAppointment: (payload) => fetchWithAuth(`/api/appointments`, { method: 'POST', body: JSON.stringify(payload) }),
  login: (email, password) => auth.login(email, password)
};
