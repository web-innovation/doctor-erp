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
} from 'react-icons/fa';

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
  { icon: FaHospital, text: 'Startup-friendly — built for growing clinics' },
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
    price: '₹1,999',
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
    price: '₹4,999',
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

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <FaHospital className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Docsy</span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition">Features</a>
              <a href="#reports" className="text-gray-600 hover:text-blue-600 transition">Reports</a>
              <Link to="/login" className="text-gray-600 hover:text-blue-600 transition">Login</Link>
              <Link
                to="/register"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Get Started
              </Link>
            </div>
          </div>
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
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-600/30"
                >
                  Get Started Free
                  <FaArrowRight className="ml-2" />
                </Link>
                <button className="inline-flex items-center justify-center border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition">
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

      {/* Benefits Section */}
      <section className="py-24 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Why Doctors Love Docsy
              </h2>
              <p className="text-blue-100 text-lg mb-8">
                Join thousands of healthcare professionals who have transformed their practice
                with our comprehensive clinic management solution.
              </p>
              <ul className="space-y-4">
                {[
                  'Reduce administrative work by 70%',
                  'Never miss a follow-up appointment',
                  'Instant access to patient history',
                  'Secure cloud backup of all data',
                  'Works on any device, anywhere',
                  '24/7 customer support',
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
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Custom Dashboard & Powerful Features</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Personalize your clinic dashboard and workflows — no extra charges for core customizations.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border">
              <h3 className="font-semibold mb-2">Custom Dashboard</h3>
              <p className="text-gray-600">Choose widgets, arrange key KPIs, and create role-based views for doctors, reception and accountants.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border">
              <h3 className="font-semibold mb-2">Prescription & Billing</h3>
              <p className="text-gray-600">Send prescriptions and bills via Email and WhatsApp instantly. PDF & XLS exports available.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border">
              <h3 className="font-semibold mb-2">WhatsApp Bot (Upcoming)</h3>
              <p className="text-gray-600">Soon: operate clinic features via WhatsApp — book appointments, get reports and patient summaries without logging in.</p>
            </div>
          </div>
        </div>
      </section>

      {/* AI & Mobile Section */}
      <section id="ai-mobile" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">AI Language Control & Mobile Apps</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">Multi-language AI assistant (English & Hindi) to help with notes, prescriptions and smart suggestions. Native Android & iOS apps coming soon.</p>
        </div>
      </section>

      {/* G&A AI Section */}
      <section id="g-a-ai" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">G&A AI</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
            G&A AI provides intelligent assistance for clinical notes, prescriptions, and business insights — multilingual support and contextual suggestions to speed up your workflow.
          </p>
          <p className="text-sm text-gray-400">Copyright © G&A AI</p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Practice?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join 500+ clinics already using Docsy to deliver better patient care.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition"
            >
              Get Started Free
              <FaArrowRight className="ml-2" />
            </Link>
            <button className="inline-flex items-center justify-center border-2 border-gray-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:border-white transition">
              Schedule Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                  <FaHospital className="h-8 w-8 text-blue-500" />
                  <span className="text-xl font-bold text-white">Docsy</span>
                </div>
                <p className="text-gray-400 mb-4">
                  Smart healthcare management for modern clinics across India.
                </p>
                <p className="text-gray-400 mb-2">Get this application: 9306845764</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white transition">Features</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Integrations</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Updates</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400">
              © {new Date().getFullYear()} Docsy. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
