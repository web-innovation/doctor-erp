import { Link } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import SEO from '../components/seo/SEO';
import PublicSiteHeader from '../components/public/PublicSiteHeader';
import PublicSiteFooter from '../components/public/PublicSiteFooter';

export default function AppointmentConfirmation() {
  return (
    <div className="min-h-screen bg-slate-50">
      <SEO
        title="Appointment Confirmation | Docsy ERP"
        description="Your appointment request has been received successfully."
        path="/appointment-confirmation"
      />
      <PublicSiteHeader />
      <main className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-center">
          <FaCheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Appointment Confirmed</h1>
          <p className="mt-3 text-gray-600">
            Thank you. Your appointment has been scheduled successfully.
          </p>
          <p className="mt-2 text-gray-600">
            Our team may contact you shortly for any required confirmation details.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700"
            >
              Back To Home
            </Link>
            <Link
              to="/help-center"
              className="inline-flex items-center rounded-lg border border-gray-300 px-5 py-3 text-gray-700 font-medium hover:bg-gray-50"
            >
              Need Help
            </Link>
          </div>
        </div>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
