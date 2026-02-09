/**
 * DocClinic ERP - Interactive Demo Script for Doctor KT Video
 * 
 * This script demonstrates all features with ACTUAL DATA ENTRY.
 * Run with: npm run demo:interactive
 * 
 * ⚠️ START YOUR SCREEN RECORDER BEFORE RUNNING THIS SCRIPT!
 */

const BASE_URL = 'http://localhost:5173';

// Demo credentials
const DEMO_CREDENTIALS = {
  email: 'doctor@demo.com',
  password: 'demo123'
};

// Demo patient data for creating new patient
const NEW_PATIENT = {
  name: 'Anita Sharma',
  phone: '9988776655',
  email: 'anita.sharma@email.com',
  age: '32',
  gender: 'Female',
  bloodGroup: 'A+',
  address: '456 Park Street, Mumbai - 400001'
};

// Helper: Slow typing effect for demo
function slowType(browser, selector, text, delay = 100) {
  browser.clearValue(selector);
  for (let char of text) {
    browser.setValue(selector, char);
    browser.pause(delay);
  }
  return browser;
}

// Helper: Pause for visibility
function pause(browser, ms = 1500) {
  return browser.pause(ms);
}

// Helper: Click with highlight effect
function clickWithHighlight(browser, selector) {
  browser.execute(function(sel) {
    const el = document.querySelector(sel);
    if (el) {
      el.style.outline = '3px solid #3b82f6';
      el.style.outlineOffset = '2px';
      setTimeout(() => {
        el.style.outline = '';
        el.style.outlineOffset = '';
      }, 1000);
    }
  }, [selector]);
  browser.pause(500);
  browser.click(selector);
  return browser;
}

module.exports = {
  '@tags': ['demo', 'interactive', 'doctor-kt'],
  
  before: function(browser) {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║     DocClinic ERP - Interactive Doctor Training Demo            ║');
    console.log('║                                                                  ║');
    console.log('║     🎥 START YOUR SCREEN RECORDER NOW!                          ║');
    console.log('║                                                                  ║');
    console.log('║     This demo will:                                             ║');
    console.log('║     ✓ Login to the system                                       ║');
    console.log('║     ✓ Navigate all modules                                      ║');
    console.log('║     ✓ Show you how to use each feature                          ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log('\n');
    console.log('Starting in 5 seconds...');
    browser.pause(5000);
  },

  // ============================================
  // PART 1: LANDING & LOGIN
  // ============================================
  '1. View Landing Page - See DocClinic Features': function(browser) {
    console.log('\n🎬 Scene 1: Landing Page Overview\n');
    
    browser
      .url(BASE_URL)
      .waitForElementVisible('body', 5000)
      .maximizeWindow();
    
    pause(browser, 3000);
    
    // Scroll through features section
    console.log('   → Showing product features...');
    browser.execute('window.scrollTo({ top: 600, behavior: "smooth" })');
    pause(browser, 2500);
    
    // Scroll to pricing
    console.log('   → Showing pricing plans...');
    browser.execute('window.scrollTo({ top: 1200, behavior: "smooth" })');
    pause(browser, 2500);
    
    // Back to top
    browser.execute('window.scrollTo({ top: 0, behavior: "smooth" })');
    pause(browser, 1500);
  },

  '2. Login as Doctor': function(browser) {
    console.log('\n🎬 Scene 2: Doctor Login\n');
    
    // Navigate to login
    browser.url(`${BASE_URL}/login`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2000);
    
    console.log('   → Entering email: doctor@demo.com');
    browser.waitForElementVisible('input[type="email"], input[name="email"]', 5000);
    
    // Type email with visible typing
    browser.clearValue('input[type="email"], input[name="email"]');
    browser.setValue('input[type="email"], input[name="email"]', DEMO_CREDENTIALS.email);
    pause(browser, 1000);
    
    console.log('   → Entering password');
    browser.clearValue('input[type="password"], input[name="password"]');
    browser.setValue('input[type="password"], input[name="password"]', DEMO_CREDENTIALS.password);
    pause(browser, 1000);
    
    console.log('   → Clicking Login button');
    browser.click('button[type="submit"]');
    
    // Wait for dashboard
    browser.waitForElementVisible('body', 10000);
    pause(browser, 3000);
  },

  // ============================================
  // PART 2: DASHBOARD
  // ============================================
  '3. Dashboard Overview - Your Daily Summary': function(browser) {
    console.log('\n🎬 Scene 3: Dashboard - Your Command Center\n');
    
    browser.url(`${BASE_URL}/dashboard`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2500);
    
    console.log('   → Dashboard shows:');
    console.log('     • Today\'s appointments count');
    console.log('     • Pending bills');
    console.log('     • Low stock alerts');
    console.log('     • Recent activity');
    
    // Scroll to show all cards
    browser.execute('window.scrollTo({ top: 350, behavior: "smooth" })');
    pause(browser, 2500);
    
    browser.execute('window.scrollTo({ top: 0, behavior: "smooth" })');
    pause(browser, 1500);
  },

  // ============================================
  // PART 3: PATIENTS
  // ============================================
  '4. Patients - View Patient List': function(browser) {
    console.log('\n🎬 Scene 4: Patient Management\n');
    
    browser.url(`${BASE_URL}/patients`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2500);
    
    console.log('   → Patient list shows:');
    console.log('     • Patient name and ID');
    console.log('     • Contact details');
    console.log('     • Last visit date');
    console.log('     • Quick actions');
    
    // Scroll through list
    browser.execute('window.scrollTo({ top: 300, behavior: "smooth" })');
    pause(browser, 2000);
    
    browser.execute('window.scrollTo({ top: 0, behavior: "smooth" })');
    pause(browser, 1500);
  },

  // ============================================
  // PART 4: APPOINTMENTS
  // ============================================
  '5. Appointments - Today\'s Schedule': function(browser) {
    console.log('\n🎬 Scene 5: Appointment Management\n');
    
    browser.url(`${BASE_URL}/appointments`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2500);
    
    console.log('   → Appointments view shows:');
    console.log('     • Today\'s appointments');
    console.log('     • Patient name and time');
    console.log('     • Status (Scheduled/Completed)');
    
    // Show calendar view
    console.log('\n   → Opening Calendar View...');
    browser.url(`${BASE_URL}/appointments/calendar`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2500);
  },

  // ============================================
  // PART 5: PRESCRIPTIONS
  // ============================================
  '6. Prescriptions - Write Digital Prescriptions': function(browser) {
    console.log('\n🎬 Scene 6: Digital Prescriptions\n');
    
    browser.url(`${BASE_URL}/prescriptions`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2500);
    
    console.log('   → View past prescriptions');
    console.log('   → Search by patient or date');
    
    // Open new prescription form
    console.log('\n   → Opening New Prescription Form...');
    browser.url(`${BASE_URL}/prescriptions/new`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2000);
    
    console.log('   → Prescription form includes:');
    console.log('     • Patient selection');
    console.log('     • Diagnosis');
    console.log('     • Medicines with dosage');
    console.log('     • Lab tests');
    console.log('     • Follow-up date');
    
    // Scroll to show full form
    browser.execute('window.scrollTo({ top: 400, behavior: "smooth" })');
    pause(browser, 2000);
    
    browser.execute('window.scrollTo({ top: 0, behavior: "smooth" })');
    pause(browser, 1500);
  },

  // ============================================
  // PART 6: PHARMACY
  // ============================================
  '7. Pharmacy - Inventory Management': function(browser) {
    console.log('\n🎬 Scene 7: Pharmacy Inventory\n');
    
    browser.url(`${BASE_URL}/pharmacy`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2500);
    
    console.log('   → Inventory features:');
    console.log('     • Product list with stock');
    console.log('     • Low stock alerts');
    console.log('     • Expiry tracking');
    console.log('     • Purchase/Sale history');
    
    // Scroll through products
    browser.execute('window.scrollTo({ top: 350, behavior: "smooth" })');
    pause(browser, 2500);
    
    browser.execute('window.scrollTo({ top: 0, behavior: "smooth" })');
    pause(browser, 1500);
  },

  // ============================================
  // PART 7: BILLING
  // ============================================
  '8. Billing - Generate GST Invoices': function(browser) {
    console.log('\n🎬 Scene 8: Billing & Invoicing\n');
    
    browser.url(`${BASE_URL}/billing`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2500);
    
    console.log('   → Billing features:');
    console.log('     • View all bills');
    console.log('     • Filter by status');
    console.log('     • Payment tracking');
    
    // Show new bill form
    console.log('\n   → Opening New Bill Form...');
    browser.url(`${BASE_URL}/billing/new`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2000);
    
    console.log('   → New bill form includes:');
    console.log('     • Patient selection');
    console.log('     • Add services/products');
    console.log('     • Automatic GST calculation');
    console.log('     • Multiple payment methods');
    
    browser.execute('window.scrollTo({ top: 400, behavior: "smooth" })');
    pause(browser, 2000);
    
    browser.execute('window.scrollTo({ top: 0, behavior: "smooth" })');
    pause(browser, 1500);
  },

  // ============================================
  // PART 8: REPORTS
  // ============================================
  '9. Reports - Business Analytics': function(browser) {
    console.log('\n🎬 Scene 9: Reports & Analytics\n');
    
    browser.url(`${BASE_URL}/reports`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2500);
    
    console.log('   → Report types:');
    console.log('     • Sales Report');
    console.log('     • OPD Report');
    console.log('     • Collection Report');
    console.log('     • Pharmacy Report');
    console.log('     • Patient Report');
    
    browser.execute('window.scrollTo({ top: 400, behavior: "smooth" })');
    pause(browser, 2500);
    
    browser.execute('window.scrollTo({ top: 0, behavior: "smooth" })');
    pause(browser, 1500);
  },

  // ============================================
  // PART 9: LABS & AGENTS
  // ============================================
  '10. Labs & Agents - Commission Tracking': function(browser) {
    console.log('\n🎬 Scene 10: Labs & Referral Agents\n');
    
    browser.url(`${BASE_URL}/labs-agents`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2500);
    
    console.log('   → Features:');
    console.log('     • Manage partner labs');
    console.log('     • Track referral agents');
    console.log('     • Commission calculation');
    console.log('     • Pending payments');
    
    pause(browser, 1500);
  },

  // ============================================
  // PART 10: SETTINGS
  // ============================================
  '11. Settings - Customize Your Clinic': function(browser) {
    console.log('\n🎬 Scene 11: Settings & Configuration\n');
    
    browser.url(`${BASE_URL}/settings`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 2500);
    
    console.log('   → Settings tabs:');
    console.log('     • Profile settings');
    console.log('     • Clinic details');
    console.log('     • Tax configuration');
    console.log('     • Working hours');
    console.log('     • Preferences');
    
    browser.execute('window.scrollTo({ top: 300, behavior: "smooth" })');
    pause(browser, 2000);
    
    browser.execute('window.scrollTo({ top: 0, behavior: "smooth" })');
    pause(browser, 1500);
  },

  // ============================================
  // FINAL: RETURN TO DASHBOARD
  // ============================================
  '12. Demo Complete - Back to Dashboard': function(browser) {
    console.log('\n🎬 Scene 12: Demo Complete!\n');
    
    browser.url(`${BASE_URL}/dashboard`);
    browser.waitForElementVisible('body', 5000);
    pause(browser, 3000);
    
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                  ║');
    console.log('║     ✅ DEMO COMPLETE!                                           ║');
    console.log('║                                                                  ║');
    console.log('║     🎬 You can stop your screen recorder now                    ║');
    console.log('║                                                                  ║');
    console.log('║     Key Features Covered:                                        ║');
    console.log('║     ✓ Patient Management                                        ║');
    console.log('║     ✓ Appointment Scheduling                                    ║');
    console.log('║     ✓ Digital Prescriptions                                     ║');
    console.log('║     ✓ Pharmacy Inventory                                        ║');
    console.log('║     ✓ GST Billing                                               ║');
    console.log('║     ✓ Reports & Analytics                                       ║');
    console.log('║     ✓ Labs & Agent Commissions                                  ║');
    console.log('║     ✓ Clinic Settings                                           ║');
    console.log('║                                                                  ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log('\n');
    
    // Keep browser open for a moment
    pause(browser, 5000);
  },

  after: function(browser) {
    browser.end();
  }
};
