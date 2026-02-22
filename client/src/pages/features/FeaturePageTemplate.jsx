import { Link } from 'react-router-dom';
import { FaCheckCircle, FaHospital } from 'react-icons/fa';
import SEO from '../../components/seo/SEO';

export default function FeaturePageTemplate({
  path,
  title,
  subtitle,
  description,
  points = [],
}) {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title={`${title} | Docsy ERP`}
        description={description}
        path={path}
        schema={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: title,
          description,
          url: `https://docsyerp.in${path}`,
        }}
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
