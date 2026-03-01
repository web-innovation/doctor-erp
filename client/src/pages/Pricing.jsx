import { Link } from 'react-router-dom';
import SEO from '../components/seo/SEO';

const plans = [
  {
    id: 'trial',
    name: 'Free Trial',
    price: 'INR 0',
    period: '/14 days',
    badge: 'No Card Needed',
    description: 'Try core workflows and onboarding support before paying.',
    cta: 'Start Free Trial',
    ctaTo: '/register',
    featured: false,
    features: [
      '10 invoice uploads total',
      'Core modules enabled',
      'Email support',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 'INR 999',
    period: '/month',
    badge: 'Most Popular',
    description: 'For growing clinics that need complete daily operations.',
    cta: 'Choose Starter',
    ctaTo: '/register',
    featured: true,
    features: [
      '3 staff logins included',
      '100 invoice uploads per month',
      'Extra user: INR 249/month',
      '6 months prepay: 10% off',
      '12 months prepay: 20% off',
    ],
  },
  {
    id: 'higher',
    name: 'Higher Plan',
    price: 'Custom',
    period: '',
    badge: 'Scale Plan',
    description: 'For high-volume clinics with custom limits and onboarding.',
    cta: 'Contact Sales',
    ctaTo: '/login',
    featured: false,
    features: [
      '300+ invoice uploads per month',
      'Higher user-seat bundles',
      'Priority onboarding',
      'Custom access controls',
    ],
  },
];

const comparisonRows = [
  ['Trial Duration', '14 days', '-', '-'],
  ['Included Users', '1', '3', 'Custom'],
  ['Monthly Uploads', '10 total', '100/month', '300+/month'],
  ['Extra User Price', '-', 'INR 249', 'Custom'],
  ['6-Month Discount', '-', '10%', 'Custom'],
  ['12-Month Discount', '-', '20%', 'Custom'],
  ['Referral Reward', 'Eligible after paid plan', '10% annual discount', '10% annual discount'],
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <SEO
        title="Docsy ERP Pricing for Indian Clinics"
        description="Professional pricing for Indian clinics: start with a 14-day free trial, then scale with clear monthly plans."
        path="/pricing"
      />

      <section className="border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold tracking-[0.14em] uppercase text-blue-700">Pricing</p>
            <h1 className="mt-3 text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
              Professional Plans For Clinics That Need Predictable Growth
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Start with a free trial, then move to a clear monthly plan with controlled limits and strong access management.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1">14-day trial</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">INR 999 starter</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">3-day grace period</span>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`rounded-2xl border bg-white p-6 shadow-sm ${
                plan.featured ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">{plan.name}</h2>
                <span className="text-xs font-semibold uppercase tracking-wide text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                  {plan.badge}
                </span>
              </div>
              <div className="mt-4 flex items-end gap-1">
                <p className="text-3xl font-bold text-slate-900">{plan.price}</p>
                {plan.period && <p className="text-slate-500 mb-1">{plan.period}</p>}
              </div>
              <p className="mt-2 text-sm text-slate-600">{plan.description}</p>

              <ul className="mt-5 space-y-2 text-sm text-slate-700">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-emerald-600">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={plan.ctaTo}
                className={`mt-6 inline-flex w-full justify-center rounded-lg px-4 py-2.5 font-semibold transition ${
                  plan.featured
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                }`}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Plan Comparison</h3>
            <p className="text-sm text-slate-600 mt-1">Everything important, side by side.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-slate-700">Feature</th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-700">Trial</th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-700">Starter</th>
                  <th className="text-left px-6 py-3 font-semibold text-slate-700">Higher</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row[0]} className="border-t border-slate-100">
                    <td className="px-6 py-3 font-medium text-slate-800">{row[0]}</td>
                    <td className="px-6 py-3 text-slate-600">{row[1]}</td>
                    <td className="px-6 py-3 text-slate-600">{row[2]}</td>
                    <td className="px-6 py-3 text-slate-600">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <h4 className="text-lg font-semibold text-slate-900">Billing and Access Rules</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>• Renewal reminders at T-7, T-3 and T-1.</li>
            <li>• 3-day grace period after expiry.</li>
            <li>• Post-grace account becomes read-only with upgrade prompt.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
