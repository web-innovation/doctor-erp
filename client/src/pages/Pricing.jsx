import { Link } from 'react-router-dom';
import SEO from '../components/seo/SEO';

const plans = [
  {
    name: '14-Day Trial',
    price: 'Free',
    subtitle: 'Try all core workflows',
    features: [
      'Up to 10 invoice uploads total',
      'Core clinic workflow access',
      'Upgrade anytime to paid plan',
    ],
  },
  {
    name: 'Starter',
    price: '₹999/month',
    subtitle: 'Best for growing clinics',
    highlight: true,
    features: [
      '3 staff logins included',
      '100 invoice uploads per month',
      'Extra user: ₹249 per month',
      '6-month plan: 10% discount',
      '12-month plan: 20% discount',
      'Referral: 10% off annual after referee pays 2 months',
    ],
  },
  {
    name: 'Higher',
    price: 'Custom',
    subtitle: 'For high-volume clinics',
    features: [
      '300+ invoice uploads per month',
      'More user seats and custom limits',
      'Priority support and onboarding',
      'Enterprise controls and rollout support',
    ],
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Docsy ERP Pricing for Indian Clinics"
        description="Transparent pricing for clinic management software: 14-day trial, starter plan, annual discounts, and controlled usage limits."
        path="/pricing"
      />
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900">Simple Pricing</h1>
          <p className="text-gray-600 mt-3">Built for Indian clinics with clear limits and predictable costs.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 bg-white ${plan.highlight ? 'border-blue-400 shadow-lg' : 'border-gray-200'}`}
            >
              <h2 className="text-xl font-semibold text-gray-900">{plan.name}</h2>
              <p className="text-3xl font-bold text-gray-900 mt-2">{plan.price}</p>
              <p className="text-sm text-gray-500 mt-1">{plan.subtitle}</p>
              <ul className="mt-5 space-y-2 text-sm text-gray-700">
                {plan.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              <Link
                to="/login"
                className={`inline-flex mt-6 px-4 py-2 rounded-lg font-medium ${plan.highlight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
              >
                Start now
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-10 bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900">Billing & Access Rules</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li>• Subscription reminders are shown at T-7, T-3, and T-1 days before expiry.</li>
            <li>• Grace period: 3 days after expiry.</li>
            <li>• After grace, account shifts to read-only mode until upgrade.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
