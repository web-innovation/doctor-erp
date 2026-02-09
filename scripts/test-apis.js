// DocClinic ERP - API Test Script
const BASE_URL = 'http://localhost:3001/api';
let authToken = null;

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`)
};

async function testAPI(name, method, endpoint, body = null, requiresAuth = false) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (requiresAuth && authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json().catch(() => ({}));
    
    if (response.ok) {
      log.success(`${name} - ${response.status}`);
      return { success: true, data, status: response.status };
    } else {
      log.error(`${name} - ${response.status}: ${data.error || data.message || 'Unknown error'}`);
      return { success: false, data, status: response.status };
    }
  } catch (error) {
    log.error(`${name} - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('       DocClinic ERP - API Test Suite');
  console.log('='.repeat(60) + '\n');
  
  let passed = 0;
  let failed = 0;
  
  // ==========================================
  // 1. HEALTH CHECK
  // ==========================================
  console.log('\n--- HEALTH CHECK ---');
  let result = await testAPI('Health Check', 'GET', '/health');
  result.success ? passed++ : failed++;
  
  // ==========================================
  // 2. AUTH ENDPOINTS
  // ==========================================
  console.log('\n--- AUTH ENDPOINTS ---');
  
  // Register (may fail if user exists)
  result = await testAPI('Register User', 'POST', '/auth/register', {
    name: 'Test Doctor',
    email: 'testdoctor@clinic.com',
    password: 'password123',
    role: 'DOCTOR'
  });
  
  // Login with demo credentials
  result = await testAPI('Login', 'POST', '/auth/login', {
    email: 'doctor@demo.com',
    password: 'demo123'
  });
  
  if (result.success && result.data.token) {
    authToken = result.data.token;
    log.info('Auth token obtained');
    passed++;
  } else {
    failed++;
  }
  
  // Get Profile (requires auth)
  result = await testAPI('Get Profile', 'GET', '/auth/me', null, true);
  result.success ? passed++ : failed++;
  
  // ==========================================
  // 3. DASHBOARD ENDPOINTS
  // ==========================================
  console.log('\n--- DASHBOARD ENDPOINTS ---');
  
  result = await testAPI('Dashboard Stats', 'GET', '/dashboard/stats', null, true);
  result.success ? passed++ : failed++;
  
  result = await testAPI('Dashboard Charts', 'GET', '/dashboard/charts?period=month', null, true);
  result.success ? passed++ : failed++;
  
  result = await testAPI('Dashboard Alerts', 'GET', '/dashboard/alerts', null, true);
  result.success ? passed++ : failed++;
  
  // ==========================================
  // 4. PATIENTS ENDPOINTS
  // ==========================================
  console.log('\n--- PATIENTS ENDPOINTS ---');
  
  result = await testAPI('Get Patients', 'GET', '/patients', null, true);
  result.success ? passed++ : failed++;
  
  // Create patient
  result = await testAPI('Create Patient', 'POST', '/patients', {
    name: 'Test Patient',
    phone: '9876543210',
    email: 'testpatient@example.com',
    gender: 'MALE',
    dateOfBirth: '1990-01-15'
  }, true);
  
  let patientId = result.data?.id || result.data?.patient?.id;
  result.success ? passed++ : failed++;
  
  if (patientId) {
    result = await testAPI('Get Patient by ID', 'GET', `/patients/${patientId}`, null, true);
    result.success ? passed++ : failed++;
  }
  
  // ==========================================
  // 5. APPOINTMENTS ENDPOINTS
  // ==========================================
  console.log('\n--- APPOINTMENTS ENDPOINTS ---');
  
  result = await testAPI('Get Appointments', 'GET', '/appointments', null, true);
  result.success ? passed++ : failed++;
  
  result = await testAPI('Get Calendar', 'GET', '/appointments/calendar?month=2&year=2026', null, true);
  result.success ? passed++ : failed++;
  
  // ==========================================
  // 6. PRESCRIPTIONS ENDPOINTS
  // ==========================================
  console.log('\n--- PRESCRIPTIONS ENDPOINTS ---');
  
  result = await testAPI('Get Prescriptions', 'GET', '/prescriptions', null, true);
  result.success ? passed++ : failed++;
  
  // ==========================================
  // 7. PHARMACY ENDPOINTS
  // ==========================================
  console.log('\n--- PHARMACY ENDPOINTS ---');
  
  result = await testAPI('Get Products', 'GET', '/pharmacy/products', null, true);
  result.success ? passed++ : failed++;
  
  result = await testAPI('Get Low Stock', 'GET', '/pharmacy/products/low-stock', null, true);
  result.success ? passed++ : failed++;
  
  // ==========================================
  // 8. BILLING ENDPOINTS
  // ==========================================
  console.log('\n--- BILLING ENDPOINTS ---');
  
  result = await testAPI('Get Bills', 'GET', '/billing', null, true);
  result.success ? passed++ : failed++;
  
  result = await testAPI('Get Summary', 'GET', '/billing/summary', null, true);
  result.success ? passed++ : failed++;
  
  // ==========================================
  // 9. STAFF ENDPOINTS
  // ==========================================
  console.log('\n--- STAFF ENDPOINTS ---');
  
  result = await testAPI('Get Staff', 'GET', '/staff', null, true);
  result.success ? passed++ : failed++;
  
  // ==========================================
  // 10. REPORTS ENDPOINTS
  // ==========================================
  console.log('\n--- REPORTS ENDPOINTS ---');
  
  result = await testAPI('Sales Report', 'GET', '/reports/sales?period=month', null, true);
  result.success ? passed++ : failed++;
  
  result = await testAPI('Patient Report', 'GET', '/reports/patients?period=month', null, true);
  result.success ? passed++ : failed++;
  
  // ==========================================
  // 11. LABS & AGENTS ENDPOINTS
  // ==========================================
  console.log('\n--- LABS & AGENTS ENDPOINTS ---');
  
  result = await testAPI('Get Labs', 'GET', '/labs-agents/labs', null, true);
  result.success ? passed++ : failed++;
  
  result = await testAPI('Get Agents', 'GET', '/labs-agents/agents', null, true);
  result.success ? passed++ : failed++;
  
  // ==========================================
  // 12. CLINIC SETTINGS
  // ==========================================
  console.log('\n--- CLINIC SETTINGS ---');
  
  result = await testAPI('Get Clinic Settings', 'GET', '/clinic/settings', null, true);
  result.success ? passed++ : failed++;
  
  // ==========================================
  // SUMMARY
  // ==========================================
  console.log('\n' + '='.repeat(60));
  console.log('                    TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`Total:  ${passed + failed}`);
  console.log('='.repeat(60) + '\n');
}

runTests();
