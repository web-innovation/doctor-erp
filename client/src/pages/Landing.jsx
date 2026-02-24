import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaUserInjured,
  FaPrescriptionBottleAlt,
  FaWarehouse,
  FaFileInvoiceDollar,
  FaWhatsapp,
  FaChartLine,
  FaCheck,
  FaStar,
  FaArrowRight,
  FaHospital,
  FaShieldAlt,
  FaClock,
  FaRobot,
  FaBolt,
  FaLayerGroup,
  FaFileUpload,
  FaTable,
  FaBook,
  FaCheckCircle,
  FaFacebookF,
  FaYoutube,
  FaBars,
  FaTimes,
} from 'react-icons/fa';
import SEO from '../components/seo/SEO';

const features = [
  {
    icon: FaUserInjured,
    title: 'Patient Management',
    description: 'Complete patient records, medical history, and appointment tracking in one place.',
  },
  {
    icon: FaPrescriptionBottleAlt,
    title: 'Smart Prescriptions',
    description: 'AI-powered prescription suggestions with drug interaction alerts and dosage guidance.',
  },
  {
    icon: FaWarehouse,
    title: 'Pharmacy Inventory',
    description: 'Real-time stock tracking, expiry alerts, and automated reorder notifications.',
  },
  {
    icon: FaFileInvoiceDollar,
    title: 'Billing & GST',
    description: 'Generate GST-compliant invoices, track payments, and manage financial reports.',
  },
  {
    icon: FaWhatsapp,
    title: 'WhatsApp Integration',
    description: 'Send appointment reminders, prescriptions, and bills directly via WhatsApp.',
  },
  {
    icon: FaChartLine,
    title: 'Detailed Reports',
    description: 'Comprehensive analytics and insights to grow your practice efficiently.',
  },
];

const benefits = [
  { icon: FaClock, text: 'Save hours daily on administrative work' },
  { icon: FaShieldAlt, text: 'HIPAA compliant data security and routine security audits' },
  { icon: FaHospital, text: 'Startup-friendly - built for growing clinics' },
];

const uniqueHighlights = [
  {
    icon: FaLayerGroup,
    title: 'One flow from appointment to billing',
    description: 'Appointments, prescriptions, pharmacy, billing, and reports are connected so staff never re-enter the same data.',
  },
  {
    icon: FaBolt,
    title: 'Built for fast OPD operations',
    description: 'Faster front-desk workflow, smart templates, and quick updates during rush hours.',
  },
  {
    icon: FaRobot,
    title: 'AI-powered daily assistance',
    description: 'Smart suggestions for prescription, notes, and follow-up handling to reduce repetitive clinical work.',
  },
];

const featurePages = [
  {
    path: '/features/patient-management-system-for-clinics',
    label: 'Patient Management System for Clinics',
  },
  {
    path: '/features/pharmacy-management-software-tricity',
    label: 'Pharmacy Management Software',
  },
  {
    path: '/features/online-report-dashboard-software-for-clinics-hospitals',
    label: 'Online Report Dashboard Software',
  },
  {
    path: '/features/smart-prescription-software-for-doctors',
    label: 'Smart Prescription Software for Doctors',
  },
];

const pricingPlans = [
  {
    name: 'Basic',
    price: 'Free',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      'Up to 50 patients',
      'Basic prescriptions',
      'Simple billing',
      'Email support',
    ],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 'Rs 1,999',
    period: '/month',
    description: 'Best for growing clinics',
    features: [
      'Unlimited patients',
      'Smart prescriptions',
      'GST invoicing',
      'WhatsApp integration',
      'Pharmacy inventory',
      'Priority support',
    ],
    cta: 'Start 14-day Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Rs 4,999',
    period: '/month',
    description: 'For multi-location clinics',
    features: [
      'Everything in Pro',
      'Multiple branches',
      'Advanced analytics',
      'API access',
      'Custom integrations',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

// testimonials removed per request
const testimonials = [];

const rankingSignals = [
  {
    title: 'End-to-end clinic workflow in one software',
    description: 'Appointments, EMR, e-prescription, pharmacy, billing, and analytics are connected to remove duplicate work.'
  },
  {
    title: 'Built for Indian clinics',
    description: 'Designed for OPD speed, GST billing patterns, WhatsApp communication, and practical front-desk execution.'
  },
  {
    title: 'Role-based access and audit readiness',
    description: 'Control access by doctor, receptionist, pharmacist, and admin while keeping a consistent operational trail.'
  }
];

const seoFaqs = [
  {
    q: 'What is the best clinic management software for doctors in India?',
    a: 'Docsy ERP is built for Indian clinics with appointments, patient records, digital prescriptions, pharmacy, billing, and reports in one cloud platform.'
  },
  {
    q: 'Does Docsy ERP support appointment booking and follow-up reminders?',
    a: 'Yes. Clinics can manage appointment scheduling and follow-up workflows with connected patient history and operational reporting.'
  },
  {
    q: 'Can Docsy ERP manage pharmacy, billing, and reports in one place?',
    a: 'Yes. Prescription, pharmacy inventory, billing, and report dashboards are integrated so teams do not re-enter the same data.'
  },
  {
    q: 'Is Docsy ERP suitable for small clinics and multi-doctor centers?',
    a: 'Yes. It supports single-doctor clinics as well as multi-doctor and multi-role workflows with role-based permissions.'
  }
];

export default function Landing() {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Docsy ERP | Clinic Management Software for Doctors, Pharmacy, Billing & Reports"
        description="Docsy ERP is a cloud clinic management software for doctors and healthcare teams. Manage patient records, smart prescriptions, pharmacy, billing, and live performance reports in one secure platform."
        path="/"
        image="/favicon.ico"
        schema={[
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Docsy ERP',
            url: 'https://docsyerp.in',
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Docsy ERP',
            url: 'https://docsyerp.in',
          },
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Docsy ERP',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: 'https://docsyerp.in',
            featureList: [
              'Patient management',
              'Appointment scheduling',
              'Digital prescription',
              'Pharmacy billing and inventory',
              'Online report dashboard'
            ]
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: seoFaqs.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: f.a
              }
            }))
          }
        ]}
      />
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <FaHospital className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Docsy ERP</span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition">Features</a>
              <a href="#why-choose" className="text-gray-600 hover:text-blue-600 transition">Why Choose Us</a>
              <a href="#reports" className="text-gray-600 hover:text-blue-600 transition">Reports</a>
              <Link to="/login" className="text-gray-600 hover:text-blue-600 transition">Login</Link>
            </div>

            <button
              className="md:hidden inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 text-gray-700"
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileNavOpen((prev) => !prev)}
            >
              {mobileNavOpen ? <FaTimes className="h-5 w-5" /> : <FaBars className="h-5 w-5" />}
            </button>
          </div>

          {mobileNavOpen && (
            <div className="md:hidden pb-3 border-t border-gray-100">
              <div className="flex flex-col pt-2">
                <a
                  href="#features"
                  onClick={() => setMobileNavOpen(false)}
                  className="px-2 py-2 text-gray-700 hover:text-blue-600"
                >
                  Features
                </a>
                <a
                  href="#why-choose"
                  onClick={() => setMobileNavOpen(false)}
                  className="px-2 py-2 text-gray-700 hover:text-blue-600"
                >
                  Why Choose Us
                </a>
                <a
                  href="#reports"
                  onClick={() => setMobileNavOpen(false)}
                  className="px-2 py-2 text-gray-700 hover:text-blue-600"
                >
                  Reports
                </a>
                <Link
                  to="/login"
                  onClick={() => setMobileNavOpen(false)}
                  className="px-2 py-2 text-gray-700 hover:text-blue-600"
                >
                  Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-indigo-50 pt-16 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FaStar className="mr-2" /> Built for startups & growing clinics
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Smart Healthcare Management for{' '}
                <span className="text-blue-600">Modern Clinics</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Streamline your practice with intelligent patient management, smart prescriptions,
                and seamless billing. Everything you need to run a successful clinic.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowDemoModal(true)}
                  className="inline-flex items-center justify-center border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition"
                >
                  Book a Demo
                </button>
              </div>
              <div className="mt-8 flex items-center gap-8">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-600">
                    <benefit.icon className="text-green-500 mr-2" />
                    {benefit.text}
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-2xl opacity-20"></div>
                <img
                  src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800"
                  alt="Doctor using tablet"
                  className="relative rounded-2xl shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Run Your Clinic
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed specifically for Indian healthcare providers
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-8 rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-600/5 transition-all duration-300"
              >
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
                  <feature.icon className="text-2xl text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEO Feature Pages */}
      <section className="py-14 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Specialized Solutions by Department</h2>
          <p className="text-gray-600 mb-6">Explore detailed feature pages designed around high-intent clinic management keywords.</p>
          <div className="grid md:grid-cols-2 gap-3">
            {featurePages.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="group flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-blue-200 hover:shadow-sm transition"
              >
                <span className="font-medium text-gray-800 group-hover:text-blue-700">{item.label}</span>
                <FaArrowRight className="text-gray-400 group-hover:text-blue-600" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Unique Highlights */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What Makes Docsy ERP Different</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Focused on connected clinic workflows, practical automation, and faster staff execution.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {uniqueHighlights.map((item) => (
              <div key={item.title} className="rounded-2xl border border-gray-100 p-7 bg-white shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-5">
                  <item.icon className="text-blue-700 text-xl" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Invoice & Ledger Section */}
      <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50 border-y border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Invoice Upload Review & Smart Ledger</h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              Two powerful features that remove tedious manual work and keep your clinic accounts accurate.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FaFileUpload className="text-blue-700" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900">Invoice Upload & Review</h3>
              </div>
              <p className="text-gray-600 mb-5">
                Upload supplier invoices, review extracted values, and confirm in minutes instead of entering line-by-line manually.
              </p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-center">
                  <FaFileUpload className="mx-auto mb-2 text-blue-600" />
                  Upload
                </div>
                <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-center">
                  <FaTable className="mx-auto mb-2 text-indigo-600" />
                  Review
                </div>
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-center">
                  <FaCheckCircle className="mx-auto mb-2 text-emerald-600" />
                  Finalize
                </div>
              </div>
              <ul className="mt-6 space-y-3 text-gray-700">
                <li className="flex items-start gap-2"><FaCheck className="text-green-500 mt-1" />Reduces data-entry effort for pharmacy purchase bills.</li>
                <li className="flex items-start gap-2"><FaCheck className="text-green-500 mt-1" />Cuts human mistakes by adding a review step before final save.</li>
                <li className="flex items-start gap-2"><FaCheck className="text-green-500 mt-1" />Saves staff time during high-volume billing days.</li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-lg bg-amber-100 flex items-center justify-center">
                  <FaBook className="text-amber-700" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900">Ledger That Stays Updated</h3>
              </div>
              <p className="text-gray-600 mb-5">
                Automatically connected ledger entries help clinics track payable/receivable flow and make better cash decisions every day.
              </p>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-gray-600">Purchase Entry</span>
                  <span className="text-sm font-semibold text-gray-900">Posted to Ledger</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-sm text-gray-600">Sales Collection</span>
                  <span className="text-sm font-semibold text-gray-900">Auto Reconciled</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Daily Summary</span>
                  <span className="text-sm font-semibold text-gray-900">Ready for Review</span>
                </div>
              </div>
              <ul className="mt-6 space-y-3 text-gray-700">
                <li className="flex items-start gap-2"><FaCheck className="text-green-500 mt-1" />Reduces bookkeeping confusion across counter, billing, and pharmacy.</li>
                <li className="flex items-start gap-2"><FaCheck className="text-green-500 mt-1" />Makes audit and month-end reconciliation faster.</li>
                <li className="flex items-start gap-2"><FaCheck className="text-green-500 mt-1" />Improves visibility of clinic financial health in real time.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="why-choose" className="py-24 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Why Doctors Choose Docsy ERP
              </h2>
              <p className="text-blue-100 text-lg mb-8">
                Built to improve consultation speed, reduce billing leakages, and increase repeat patient retention through better follow-up and service quality.
              </p>
              <ul className="space-y-4">
                {[
                  'Faster front desk and OPD execution with fewer manual errors',
                  'Higher patient trust with clear digital prescriptions and records',
                  'Follow-up tracking helps improve revisit conversion',
                  'Revenue visibility by doctor, service, and billing category',
                  'Cloud access for owners to monitor clinic performance anywhere',
                  'Dedicated onboarding and support for clinic teams',
                ].map((item, index) => (
                  <li key={index} className="flex items-center text-white">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <FaCheck className="text-white text-xs" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center">
                <div className="text-4xl font-bold text-white mb-2">Startup</div>
                <div className="text-blue-100">Friendly Pricing</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center">
                <div className="text-4xl font-bold text-white mb-2">HIPAA</div>
                <div className="text-blue-100">Compliant</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center">
                <div className="text-4xl font-bold text-white mb-2">Custom</div>
                <div className="text-blue-100">Dashboard & Reports</div>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center">
                <div className="text-4xl font-bold text-white mb-2">24/7</div>
                <div className="text-blue-100">Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reports & Dashboards Section */}
      <section id="reports" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Beautiful, Actionable Reports</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Export-ready, presentation-grade reports that help you understand your clinic performance at a glance.</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <ul className="space-y-4">
                <li className="flex items-start gap-4">
                  <FaCheck className="text-green-500 mt-1" />
                  <div>
                    <div className="font-semibold">Attractive pre-built report templates</div>
                    <div className="text-gray-600">Charts, tables, and downloadable PDFs for stakeholders and auditors.</div>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <FaCheck className="text-green-500 mt-1" />
                  <div>
                    <div className="font-semibold">Custom report builder</div>
                    <div className="text-gray-600">Create tailored reports with your clinic metrics without extra cost.</div>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <FaCheck className="text-green-500 mt-1" />
                  <div>
                    <div className="font-semibold">Schedule & share</div>
                    <div className="text-gray-600">Automatically email or send reports via WhatsApp to your team.</div>
                  </div>
                </li>
              </ul>
            </div>
            <div>
              <img src="https://images.unsplash.com/photo-1559526324-593bc073d938?w=900" alt="Reports preview" className="rounded-2xl shadow-lg" />
            </div>
          </div>
        </div>
      </section>

      {/* Customization & Features Section */}
      <section id="customization" className="py-24 bg-gradient-to-br from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How Docsy ERP Makes Daily Work Awesome</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">From reception to doctor to pharmacy, every step is faster, clearer, and easier to manage.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border">
              <h3 className="font-semibold mb-2">Custom Dashboard</h3>
              <p className="text-gray-600">Choose widgets, arrange KPIs, and create role-based screens for doctors, reception, and accountants.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border">
              <h3 className="font-semibold mb-2">Prescription & Billing</h3>
              <p className="text-gray-600">Generate prescriptions and invoices quickly, then share by WhatsApp or print in one click.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border">
              <h3 className="font-semibold mb-2">WhatsApp Bot (Upcoming)</h3>
              <p className="text-gray-600">Operate key clinic actions through WhatsApp commands like reminders, summaries, and updates.</p>
            </div>
          </div>
        </div>
      </section>

      {/* AI & Mobile Section */}
      <section id="ai-mobile" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How AI Makes Clinic Life Easier</h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto mb-8">Docsy ERP uses practical AI support for prescription drafting, consultation note structuring, and smart operational suggestions so doctors and staff can finish routine tasks faster with confidence.</p>
          <div className="grid md:grid-cols-3 gap-4 text-left">
            <div className="border border-gray-100 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-2">Smarter Documentation</h3>
              <p className="text-gray-600">AI helps standardize notes and avoid missing important consultation details.</p>
            </div>
            <div className="border border-gray-100 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-2">Prescription Support</h3>
              <p className="text-gray-600">Assistive suggestions reduce repetitive typing and improve clarity for patients.</p>
            </div>
            <div className="border border-gray-100 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-2">Operational Guidance</h3>
              <p className="text-gray-600">AI-backed signals highlight pending follow-ups and bottlenecks before they grow.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Positioning Section */}
      <section className="py-20 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Clinics Switch to Docsy ERP</h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              A practical clinic management software built to improve consultation speed, billing accuracy, and decision quality.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {rankingSignals.map((item) => (
              <div key={item.title} className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-600">Answers to common questions about Docsy ERP clinic software.</p>
          </div>
          <div className="space-y-3">
            {seoFaqs.map((item) => (
              <details key={item.q} className="rounded-xl border border-gray-200 bg-white p-4">
                <summary className="font-medium text-gray-900 cursor-pointer">{item.q}</summary>
                <p className="mt-2 text-gray-700">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* GA AI Section */}
      <section id="g-a-ai" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">GA AI</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
            GA AI provides intelligent assistance for clinical notes, prescriptions, and business insights - multilingual support and contextual suggestions to speed up your workflow.
          </p>
          <p className="text-sm text-gray-400">Copyright (c) GA AI</p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Practice?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join 500+ clinics already using Docsy ERP to deliver better patient care.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowDemoModal(true)}
              className="inline-flex items-center justify-center border-2 border-gray-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:border-white transition"
            >
              Schedule Demo
            </button>
          </div>
        </div>
      </section>

      {showDemoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Book a Demo</h3>
                <p className="mt-1 text-sm text-gray-600">Contact us to schedule your demo.</p>
              </div>
              <button
                onClick={() => setShowDemoModal(false)}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Email</p>
                <div className="space-y-1">
                  <a href="mailto:support@docsyerp.com" className="block text-blue-700 font-medium">
                    support@docsyerp.com
                  </a>
                  <a href="mailto:docsy360@gmail.com" className="block text-blue-700 font-medium">
                    docsy360@gmail.com
                  </a>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Phone</p>
                <a href="tel:8284073790" className="block text-blue-700 font-medium">8284073790</a>
                <a href="tel:9306845764" className="block text-blue-700 font-medium">9306845764</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                  <FaHospital className="h-8 w-8 text-blue-500" />
                  <span className="text-xl font-bold text-white">Docsy ERP</span>
                </div>
                <p className="text-gray-400 mb-4">
                  Smart healthcare management for modern clinics across India.
                </p>
                <div className="text-gray-400 space-y-1 text-sm">
                  <p>support@docsyerp.com</p>
                  <p>docsy360@gmail.com</p>
                  <p>8284073790, 9306845764</p>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <a
                    href="https://www.facebook.com/profile.php?id=61587785650391"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition"
                    aria-label="Facebook Page"
                    title="Facebook Page"
                  >
                    <FaFacebookF className="h-5 w-5" />
                  </a>
                  <a
                    href="https://www.youtube.com/channel/UCC_jW5UEsW0xaasPXVtkfgw"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition"
                    aria-label="YouTube Channel"
                    title="YouTube Channel"
                  >
                    <FaYoutube className="h-5 w-5" />
                  </a>
                </div>
                <div
                  className="mt-4 inline-flex items-center gap-3 rounded-lg border border-gray-700 bg-white/95 px-3 py-2 cursor-default"
                  title="Udyam Registration Number: UDYAM-PB-20-0122464"
                  aria-label="Udyam Registration Number: UDYAM-PB-20-0122464"
                >
                  <img
                    src="https://www.presentations.gov.in/wp-content/uploads/2020/06/Preview-11.png"
                    alt="Official MSME Logo"
                    className="h-9 w-9 rounded-full object-contain bg-white"
                    loading="lazy"
                    decoding="async"
                  />
                  <img
                    src="https://www.uxdt.nic.in/wp-content/uploads/2020/06/Digital-india-black.jpg"
                    alt="Official Digital India Logo"
                    className="h-9 w-auto object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white transition">Features</a></li>
                <li><Link to="/features/patient-management-system-for-clinics" className="text-gray-400 hover:text-white transition">Patient Management</Link></li>
                <li><Link to="/features/pharmacy-management-software-tricity" className="text-gray-400 hover:text-white transition">Pharmacy Software</Link></li>
                <li><Link to="/features/smart-prescription-software-for-doctors" className="text-gray-400 hover:text-white transition">Smart Prescription</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><Link to="/features/patient-management-system-for-clinics" className="text-gray-400 hover:text-white transition">Patient Management</Link></li>
                <li><Link to="/features/pharmacy-management-software-tricity" className="text-gray-400 hover:text-white transition">Pharmacy Software</Link></li>
                <li><Link to="/login" className="text-gray-400 hover:text-white transition">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link to="/privacy" className="text-gray-400 hover:text-white transition">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-gray-400 hover:text-white transition">Terms of Service</Link></li>
                <li><a href="#features" className="text-gray-400 hover:text-white transition">Features</a></li>
                <li><a href="#reports" className="text-gray-400 hover:text-white transition">Reports</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400">
              (c) {new Date().getFullYear()} Docsy ERP. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
