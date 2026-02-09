/**
 * DocClinic ERP - Demo Automation Script for Doctor KT Video
 * 
 * This script demonstrates all key features of the DocClinic ERP system.
 * Run with: npx nightwatch tests/e2e/doctor-demo.js --env demo
 * 
 * Start your screen recorder before running this script!
 */

const BASE_URL = 'http://localhost:5173';

// Demo credentials
const DEMO_CREDENTIALS = {
  email: 'doctor@demo.com',
  password: 'demo123'
};

// Demo patient data
const DEMO_PATIENT = {
  name: 'Rajesh Kumar',
  phone: '9876543210',
  email: 'rajesh.kumar@email.com',
  age: '45',
  gender: 'Male',
  bloodGroup: 'B+',
  address: '123, MG Road, Bangalore - 560001'
};

// Helper function for delays (for recording clarity)
function pause(browser, ms = 1500) {
  return browser.pause(ms);
}

module.exports = {
  '@tags': ['demo', 'doctor-kt'],
  
  before: function(browser) {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     DocClinic ERP - Doctor Training Demo                  ║');
    console.log('║     Start your screen recorder NOW!                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');
  },

  // ============================================
  // STEP 1: Landing Page & Login
  // ============================================
  'Step 1: View Landing Page': function(browser) {
    console.log('\n📍 Step 1: Viewing Landing Page...\n');
    
    browser
      .url(BASE_URL)
      .waitForElementVisible('body', 5000)
      .maximizeWindow();
    
    pause(browser, 2000);
    
    // Scroll through landing page to show features
    browser.execute('window.scrollTo({ top: 500, behavior: "smooth" })');
    pause(browser, 1500);
    
    browser.execute('window.scrollTo({ top: 1000, behavior: "smooth" })');
    pause(browser, 1500);
    
    browser.execute('window.scrollTo({ top: 0, behavior: "smooth" })');
    pause(browser, 1000);
  },

  'Step 2: Navigate to Login Page': function(browser) {
    console.log('\n📍 Step 2: Navigating to Login...\n');
    
    browser
      .url(`${BASE_URL}/login`)
      .waitForElementVisible('body', 5000);
    
    pause(browser, 1500);
  },

  'Step 3: Login with Demo Credentials': function(browser) {
    console.log('\n📍 Step 3: Logging in as Doctor...\n');
    
    // Wait for login form
    browser.waitForElementVisible('input[type="email"], input[name="email"]', 5000);
    
    // Clear and type email slowly
    browser
      .clearValue('input[type="email"], input[name="email"]')
      .setValue('input[type="email"], input[name="email"]', DEMO_CREDENTIALS.email);
    
    pause(browser, 800);
    
    // Clear and type password
    browser
      .clearValue('input[type="password"], input[name="password"]')
      .setValue('input[type="password"], input[name="password"]', DEMO_CREDENTIALS.password);
    
    pause(browser, 800);
    
    // Click login button
    browser.click('button[type="submit"]');
    
    // Wait for dashboard to load
    browser.waitForElementVisible('body', 10000);
    pause(browser, 2500);
  },

  // ============================================
  // STEP 4: Dashboard Overview
  // ============================================
  'Step 4: Explore Dashboard': function(browser) {
    console.log('\n📍 Step 4: Exploring Dashboard...\n');
    
    browser.url(`${BASE_URL}/dashboard`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2000);
    
    // Scroll to show all stats
    browser.execute('window.scrollTo({ top: 300, behavior: "smooth" })');
    pause(browser, 1500);
    
    browser.execute('window.scrollTo({ top: 0, behavior: "smooth" })');
    pause(browser, 1000);
  },

  // ============================================
  // STEP 5: Patient Management
  // ============================================
  'Step 5: Navigate to Patients': function(browser) {
    console.log('\n📍 Step 5: Opening Patients Module...\n');
    
    browser.url(`${BASE_URL}/patients`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2000);
  },

  'Step 6: View Patient List': function(browser) {
    console.log('\n📍 Step 6: Viewing Patient List...\n');
    
    // Scroll through patient list
    browser.execute('window.scrollTo({ top: 200, behavior: "smooth" })');
    pause(browser, 1500);
    
    browser.execute('window.scrollTo({ top: 0, behavior: "smooth" })');
    pause(browser, 1000);
  },

  // ============================================
  // STEP 7: Appointments
  // ============================================
  'Step 7: Navigate to Appointments': function(browser) {
    console.log('\n📍 Step 7: Opening Appointments...\n');
    
    browser.url(`${BASE_URL}/appointments`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2000);
  },

  'Step 8: View Appointment Calendar': function(browser) {
    console.log('\n📍 Step 8: Viewing Calendar View...\n');
    
    browser.url(`${BASE_URL}/appointments/calendar`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2000);
  },

  // ============================================
  // STEP 9: Prescriptions
  // ============================================
  'Step 9: Navigate to Prescriptions': function(browser) {
    console.log('\n📍 Step 9: Opening Prescriptions...\n');
    
    browser.url(`${BASE_URL}/prescriptions`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2000);
  },

  'Step 10: View Prescription Form': function(browser) {
    console.log('\n📍 Step 10: Opening New Prescription Form...\n');
    
    browser.url(`${BASE_URL}/prescriptions/new`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2000);
    
    // Scroll to show full form
    browser.execute('window.scrollTo({ top: 300, behavior: "smooth" })');
    pause(browser, 1500);
    
    browser.execute('window.scrollTo({ top: 0, behavior: "smooth" })');
    pause(browser, 1000);
  },

  // ============================================
  // STEP 11: Pharmacy
  // ============================================
  'Step 11: Navigate to Pharmacy': function(browser) {
    console.log('\n📍 Step 11: Opening Pharmacy Inventory...\n');
    
    browser.url(`${BASE_URL}/pharmacy`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2000);
    
    // Scroll through inventory
    browser.execute('window.scrollTo({ top: 300, behavior: "smooth" })');
    pause(browser, 1500);
    
    browser.execute('window.scrollTo({ top: 0, behavior: "smooth" })');
    pause(browser, 1000);
  },

  // ============================================
  // STEP 12: Billing
  // ============================================
  'Step 12: Navigate to Billing': function(browser) {
    console.log('\n📍 Step 12: Opening Billing Module...\n');
    
    browser.url(`${BASE_URL}/billing`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2000);
  },

  'Step 13: View New Bill Form': function(browser) {
    console.log('\n📍 Step 13: Opening New Bill Form...\n');
    
    browser.url(`${BASE_URL}/billing/new`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2000);
    
    // Scroll to show full form
    browser.execute('window.scrollTo({ top: 400, behavior: "smooth" })');
    pause(browser, 1500);
    
    browser.execute('window.scrollTo({ top: 0, behavior: "smooth" })');
    pause(browser, 1000);
  },

  // ============================================
  // STEP 14: Reports
  // ============================================
  'Step 14: Navigate to Reports': function(browser) {
    console.log('\n📍 Step 14: Opening Reports...\n');
    
    browser.url(`${BASE_URL}/reports`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2000);
    
    // Scroll through reports
    browser.execute('window.scrollTo({ top: 400, behavior: "smooth" })');
    pause(browser, 1500);
    
    browser.execute('window.scrollTo({ top: 0, behavior: "smooth" })');
    pause(browser, 1000);
  },

  // ============================================
  // STEP 15: Labs & Agents
  // ============================================
  'Step 15: Navigate to Labs & Agents': function(browser) {
    console.log('\n📍 Step 15: Opening Labs & Agents...\n');
    
    browser.url(`${BASE_URL}/labs-agents`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2000);
  },

  // ============================================
  // STEP 16: Settings
  // ============================================
  'Step 16: Navigate to Settings': function(browser) {
    console.log('\n📍 Step 16: Opening Settings...\n');
    
    browser.url(`${BASE_URL}/settings`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2000);
    
    // Scroll through settings
    browser.execute('window.scrollTo({ top: 300, behavior: "smooth" })');
    pause(browser, 1500);
    
    browser.execute('window.scrollTo({ top: 0, behavior: "smooth" })');
    pause(browser, 1000);
  },

  // ============================================
  // STEP 17: Back to Dashboard - Demo Complete
  // ============================================
  'Step 17: Return to Dashboard - Demo Complete': function(browser) {
    console.log('\n📍 Step 17: Returning to Dashboard...\n');
    
    browser.url(`${BASE_URL}/dashboard`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 3000);
    
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     ✅ Demo Complete!                                      ║');
    console.log('║     You can stop your screen recorder now.                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');
  },

  after: function(browser) {
    browser.end();
  }
};
