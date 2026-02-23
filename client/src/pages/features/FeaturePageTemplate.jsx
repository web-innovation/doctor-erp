import { Link } from 'react-router-dom';
import { FaCheckCircle, FaHospital } from 'react-icons/fa';
import SEO from '../../components/seo/SEO';

export default function FeaturePageTemplate({
  path,
  title,
  subtitle,
  description,
  points = [],
  modules = [],
  industries = [],
  faqs = [],
  primaryKeyword = '',
  secondaryKeywords = [],
}) {
  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description,
      url: `https://docsyerp.in${path}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: `Docsy ERP - ${title}`,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description,
      featureList: points.slice(0, 8),
      url: `https://docsyerp.in${path}`,
    }
  ];

  if (faqs.length > 0) {
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.a
        }
      }))
    });
  }

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title={`${title} | Docsy ERP`}
        description={description}
        path={path}
        image="/favicon.ico"
        schema={schema}
      />

      <header className="border-b border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-900 font-semibold">
            <FaHospital className="text-blue-600" />
            Docsy ERP
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-gray-600 hover:text-blue-600">Login</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <section className="mb-10">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight">{title}</h1>
          <p className="mt-4 text-lg text-gray-600 max-w-4xl">{subtitle}</p>
          {(primaryKeyword || secondaryKeywords.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {primaryKeyword ? (
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                  {primaryKeyword}
                </span>
              ) : null}
              {secondaryKeywords.map((k) => (
                <span key={k} className="px-3 py-1 rounded-full bg-gray-50 text-gray-600 text-xs border border-gray-200">
                  {k}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-7 mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">How It Helps Your Clinic</h2>
          <p className="text-gray-700 leading-relaxed">{description}</p>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          {points.map((point) => (
            <div key={point} className="border border-gray-100 rounded-xl p-5 bg-white">
              <div className="flex items-start gap-3">
                <FaCheckCircle className="text-green-500 mt-1" />
                <p className="text-gray-700">{point}</p>
              </div>
            </div>
          ))}
        </section>

        {modules.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Modules Included</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {modules.map((module) => (
                <div key={module} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-gray-800 font-medium">{module}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {industries.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Best Fit For</h2>
            <div className="flex flex-wrap gap-2">
              {industries.map((i) => (
                <span key={i} className="px-3 py-1 rounded-full border border-gray-200 text-sm text-gray-700 bg-white">
                  {i}
                </span>
              ))}
            </div>
          </section>
        )}

        {faqs.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {faqs.map((item) => (
                <details key={item.q} className="rounded-xl border border-gray-200 bg-white p-4">
                  <summary className="font-medium text-gray-900 cursor-pointer">{item.q}</summary>
                  <p className="mt-2 text-gray-700">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12 rounded-2xl border border-gray-100 p-6 bg-white">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Explore Related Solutions</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <Link to="/features/patient-management-system-for-clinics" className="rounded-lg border border-gray-100 px-4 py-3 text-gray-700 hover:border-blue-200 hover:text-blue-700 transition">
              Patient Management System for Clinics
            </Link>
            <Link to="/features/pharmacy-management-software-tricity" className="rounded-lg border border-gray-100 px-4 py-3 text-gray-700 hover:border-blue-200 hover:text-blue-700 transition">
              Pharmacy Management Software
            </Link>
            <Link to="/features/online-report-dashboard-software-for-clinics-hospitals" className="rounded-lg border border-gray-100 px-4 py-3 text-gray-700 hover:border-blue-200 hover:text-blue-700 transition">
              Online Report Dashboard Software
            </Link>
            <Link to="/features/smart-prescription-software-for-doctors" className="rounded-lg border border-gray-100 px-4 py-3 text-gray-700 hover:border-blue-200 hover:text-blue-700 transition">
              Smart Prescription Software for Doctors
            </Link>
          </div>
        </section>

        <section className="mt-12 bg-gray-900 text-white rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-semibold mb-2">Ready to See It in Action?</h2>
          <p className="text-gray-300 mb-5">Contact us to schedule a demo and explore how Docsy ERP fits your clinic.</p>
          <Link to="/login" className="inline-block bg-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">
            Login
          </Link>
        </section>
      </main>
    </div>
  );
}
