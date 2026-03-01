import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaBookMedical,
  FaSearch,
  FaClipboardList,
  FaCheckCircle,
  FaArrowRight,
  FaUserMd,
  FaShieldAlt,
  FaRobot,
  FaTools,
} from 'react-icons/fa';
import SEO from '../components/seo/SEO';

const USER_HELP_TOPICS = [
  {
    id: 'cannot-create-patient',
    title: 'I am not able to create a patient',
    module: 'Patients',
    problem: 'Save button does not work, form shows error, or patient not visible after save.',
    steps: [
      'Go to Patients and click Add Patient.',
      'Fill required fields: Patient Name and Phone.',
      'Check phone format and remove extra spaces/special characters.',
      'Click Save and wait for success message.',
      'Search by patient name or phone to verify record.',
    ],
    checks: [
      'Your role must have patient create permission.',
      'Phone should not duplicate an existing patient in same clinic if uniqueness rules apply.',
      'Session should be active (if logged out, login again).',
    ],
    keywords: ['patient', 'create patient', 'unable to save patient', 'patient form', 'add patient'],
  },
  {
    id: 'access-management',
    title: 'How Access Management works',
    module: 'Settings > Access Management',
    problem: 'Staff cannot see menu/items or cannot perform create/edit actions.',
    steps: [
      'Open Settings and go to Role Permissions / Access controls.',
      'Select role (Receptionist, Pharmacist, Doctor, Accountant, Staff).',
      'Enable required permissions (read/create/update/delete based on workflow).',
      'Save changes and ask user to refresh or re-login.',
      'Verify by checking visible sidebar menu and action buttons.',
    ],
    checks: [
      'If super admin disabled a module, clinic users cannot access it even with role permission.',
      'While viewing-as another staff user, UI follows that staff permissions.',
      'Check both role mapping and disabled permissions list.',
    ],
    keywords: ['access', 'permission', 'role', 'not able to open module', 'menu missing'],
  },
  {
    id: 'pharmacy-first-setup',
    title: 'How to setup a new pharmacy in system',
    module: 'Pharmacy',
    problem: 'New clinic does not know initial pharmacy setup sequence.',
    steps: [
      'Open Pharmacy and add basic products with name, category, unit, price, and stock.',
      'Create supplier records from Pharmacy Suppliers.',
      'Add purchases so stock and cost history become accurate.',
      'Set low-stock threshold and expiry information per item.',
      'Use upload/import option for bulk onboarding if existing inventory is large.',
    ],
    checks: [
      'Pharmacy role permission must be enabled for the logged-in user.',
      'Product GST and price fields should be correctly set before billing.',
      'After setup, test one pharmacy bill to validate stock deduction.',
    ],
    keywords: ['pharmacy setup', 'inventory setup', 'new pharmacy', 'stock setup', 'supplier setup'],
  },
  {
    id: 'prescription-workflow',
    title: 'How to create and print prescription correctly',
    module: 'Prescriptions',
    problem: 'Timing/instructions missing, print output not as expected.',
    steps: [
      'Open Prescriptions and create a new prescription.',
      'Add diagnosis, medicine, dosage, timing, and food instruction clearly.',
      'Review preview before final save.',
      'Open prescription detail and verify instructions section.',
      'Use print option only after confirming full medicine instructions are visible.',
    ],
    checks: [
      'Doctor role or prescription create permission is required.',
      'Do not skip instruction fields for each medicine.',
      'Refresh prescription detail page if stale data appears.',
    ],
    keywords: ['prescription', 'print prescription', 'medicine timing', 'instruction missing'],
  },
  {
    id: 'billing-and-payment',
    title: 'How to create bill and track payment status',
    module: 'Billing',
    problem: 'Invoices are created but collection status is unclear.',
    steps: [
      'Go to Billing and create a new bill linked to patient.',
      'Add line items and verify amount before save.',
      'Set payment mode and paid amount (full or partial).',
      'Save and print/share invoice.',
      'Use billing list filters for paid/pending/partial tracking.',
    ],
    checks: [
      'Billing create permission must be enabled.',
      'If editing bill is blocked, check billing edit permission.',
      'Use reports to reconcile daily collection totals.',
    ],
    keywords: ['billing', 'invoice', 'payment status', 'pending bill', 'partial payment'],
  },
  {
    id: 'staff-onboarding',
    title: 'How to add staff and assign role correctly',
    module: 'Staff',
    problem: 'New staff added but cannot use required modules.',
    steps: [
      'Open Staff and add staff profile with valid role.',
      'Share login credentials and ask user to login once.',
      'Configure role permissions from Access Management.',
      'Confirm sidebar modules visible for that role.',
      'Test one action per module (read/create) as needed.',
    ],
    checks: [
      'Staff limit may block new additions depending on plan.',
      'Inactive user status will prevent login.',
      'Permission update may need re-login to fully reflect.',
    ],
    keywords: ['add staff', 'role assignment', 'staff login', 'staff cannot access'],
  },
  {
    id: 'subscription-read-only',
    title: 'Clinic became read-only after subscription expiry',
    module: 'Subscription',
    problem: 'Clinic cannot perform create/update actions due to expiry.',
    steps: [
      'Check subscription status in dashboard banner.',
      'Upgrade/renew plan from pricing flow if available.',
      'If urgent, contact super admin for manual extension.',
      'After extension/renewal, refresh session and retry action.',
    ],
    checks: [
      'System gives reminders at T-7, T-3, T-1 days before expiry.',
      'Grace period is available for short continuation.',
      'Post grace, read-only mode blocks writes until renewal/extension.',
    ],
    keywords: ['read only', 'subscription expired', 'grace period', 'cannot create data'],
  },
];

const QUICK_GUIDE = [
  {
    step: 'Quick Start for New Clinic Admin',
    items: [
      'Complete clinic profile in Settings.',
      'Add staff users and assign roles.',
      'Configure Access Management before daily usage.',
      'Create first patient, appointment, prescription, and bill as dry run.',
    ],
  },
  {
    step: 'Daily Front Desk Flow',
    items: [
      'Register/search patient.',
      'Create appointment and manage queue.',
      'After consultation, complete billing and payment status.',
    ],
  },
  {
    step: 'Pharmacy Daily Flow',
    items: [
      'Update purchase entries and stock quantities.',
      'Check low-stock/expiry-sensitive items.',
      'Validate product pricing before dispensing.',
    ],
  },
  {
    step: 'End of Day Admin Review',
    items: [
      'Review dashboard alerts and pending actions.',
      'Check reports for OPD, revenue, and collections.',
      'Verify staff access issues and resolve permissions.',
    ],
  },
];

const AI_HELP = [
  'AI-assisted prescription support helps faster drafting and consistency.',
  'AI-oriented clinical note support reduces repetitive typing burden.',
  'Connected workflow context improves operational guidance across modules.',
];

function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

export default function HelpCenter() {
  const [query, setQuery] = useState('');
  const resultsRef = useRef(null);

  const filteredTopics = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return USER_HELP_TOPICS;
    return USER_HELP_TOPICS.filter((topic) => {
      const haystack = [
        topic.title,
        topic.module,
        topic.problem,
        ...(topic.steps || []),
        ...(topic.checks || []),
        ...(topic.keywords || []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      resultsRef.current.focus();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEO
        title="Help Center | Docsy ERP"
        description="User-focused Docsy ERP Help Center for how-to guides and troubleshooting across patients, access management, pharmacy, billing, and more."
        keywords={[
          'docsy help center',
          'clinic software user guide',
          'how to create patient',
          'access management help',
          'pharmacy setup guide',
        ]}
        path="/help-center"
      />

      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex items-center gap-3 mb-4">
            <FaBookMedical className="text-2xl text-blue-200" />
            <p className="text-blue-200 uppercase tracking-wider text-sm font-semibold">User Help Center</p>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            Understand Features and Solve Common Issues Fast
          </h1>
          <p className="mt-4 text-blue-100 max-w-3xl">
            Search by problem, for example: "not able to create patient", "access management", "pharmacy setup", "read only mode".
          </p>
          <form className="mt-8 max-w-3xl relative" onSubmit={handleSearchSubmit}>
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search help: create patient, permission issue, pharmacy setup..."
              className="w-full rounded-xl pl-12 pr-4 py-3 text-gray-900 bg-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </form>
          <p className="mt-3 text-sm text-blue-200">
            Showing {filteredTopics.length} of {USER_HELP_TOPICS.length} help topics
          </p>
        </div>
      </div>

      <div id="quick-guide" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <FaClipboardList className="text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Quick Guide</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {QUICK_GUIDE.map((guide) => (
              <div key={guide.step} className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-2">{guide.step}</h3>
                <ul className="space-y-1.5">
                  {guide.items.map((item) => (
                    <li key={item} className="text-sm text-gray-700 flex items-start gap-2">
                      <FaCheckCircle className="text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <FaRobot className="text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-900">AI-Supported Help</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {AI_HELP.map((item) => (
              <div key={item} className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2
              ref={resultsRef}
              tabIndex={-1}
              className="text-2xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 rounded"
            >
              How-To and Troubleshooting
            </h2>
            <p className="text-sm text-gray-500">Problem-first guides for users</p>
          </div>

          {filteredTopics.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-600">
              No matching help topic found for "<span className="font-semibold">{query}</span>".
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTopics.map((topic) => (
                <article key={topic.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-lg font-semibold text-gray-900">{topic.title}</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-1">{topic.module}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{topic.problem}</p>

                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-900 mb-2">Steps</p>
                    <ul className="space-y-1.5">
                      {topic.steps.map((step) => (
                        <li key={step} className="text-sm text-gray-700 flex items-start gap-2">
                          <FaCheckCircle className="text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-semibold text-amber-900 mb-2 inline-flex items-center gap-2">
                      <FaTools />
                      Troubleshooting Checks
                    </p>
                    <ul className="space-y-1.5">
                      {topic.checks.map((check) => (
                        <li key={check} className="text-sm text-amber-900">
                          - {check}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="bg-slate-900 text-white rounded-2xl p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <FaShieldAlt className="text-blue-300" />
                <h3 className="text-xl font-semibold">Still Blocked?</h3>
              </div>
              <p className="text-slate-200 text-sm">
                If issue continues after following the guide, contact your clinic admin (for permissions) or support team with screenshot and exact error text.
              </p>
            </div>
            <div className="flex md:justify-end items-center">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 bg-white text-slate-900 rounded-lg px-4 py-2 font-medium hover:bg-slate-100 transition"
              >
                <FaUserMd />
                Open Dashboard
                <FaArrowRight />
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Contact Support</h3>
          <p className="text-sm text-gray-600 mb-4">
            Reach our support team directly if you need setup help, access troubleshooting, or urgent assistance.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
              <p className="font-semibold text-gray-900 mb-2">Email</p>
              <p className="text-gray-700">support@docsyerp.in</p>
              <p className="text-gray-700">docsy360@gmail.com</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
              <p className="font-semibold text-gray-900 mb-2">Phone</p>
              <p className="text-gray-700">+91 9306845764</p>
              <p className="text-gray-700">+91 8284073790</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
