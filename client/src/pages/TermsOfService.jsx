import { Link } from 'react-router-dom';
import SEO from '../components/seo/SEO';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Terms of Service | Docsy ERP"
        description="Terms of Service for Docsy ERP, including account access, acceptable use, billing, data handling, and support policies."
        path="/terms"
      />

      <header className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
            <p className="text-sm text-gray-600 mt-1">Last updated: 2026-02-22</p>
          </div>
          <Link to="/" className="text-blue-600 hover:text-blue-700 text-sm">Back to Home</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">1. Overview</h2>
          <p className="text-gray-700">
            These Terms govern your use of Docsy ERP, including web and mobile experiences, features, and support
            services. By accessing the platform, you agree to these Terms on behalf of your clinic or organization.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">2. Account Access</h2>
          <p className="text-gray-700">
            Access is provided by clinic administrators. You are responsible for safeguarding credentials and for
            activity performed under your account. Notify your administrator if you suspect unauthorized use.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">3. Acceptable Use</h2>
          <ul className="list-disc pl-5 text-gray-700 space-y-1">
            <li>Use the platform only for lawful clinical and administrative purposes.</li>
            <li>Do not attempt to bypass access controls or interfere with service availability.</li>
            <li>Do not upload malicious files or share protected data outside authorized workflows.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">4. Data and Privacy</h2>
          <p className="text-gray-700">
            Clinics remain responsible for patient data they upload and manage. We process data to deliver core
            functionality, audit trails, and system security. Refer to the Privacy Policy for details.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">5. Billing and Plans</h2>
          <p className="text-gray-700">
            Paid plans are billed as agreed with the clinic owner or administrator. Usage limits and add-ons may
            apply. Non-payment may result in access restrictions after notice.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">6. Service Availability</h2>
          <p className="text-gray-700">
            We strive for high availability but do not guarantee uninterrupted access. Planned maintenance and
            emergency fixes may cause temporary downtime.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">7. Support</h2>
          <p className="text-gray-700">
            Support is provided through designated clinic contacts. Response times may vary by plan.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">8. Termination</h2>
          <p className="text-gray-700">
            We may suspend or terminate access for violations of these Terms or for security reasons. Clinics may
            request deactivation through their account owner.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">9. Changes to Terms</h2>
          <p className="text-gray-700">
            We may update these Terms as the platform evolves. Continued use after changes constitutes acceptance.
          </p>
        </section>

        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Questions?</h2>
          <p className="text-gray-700">
            Please contact your clinic administrator or reach out via the support contact shared by your clinic.
          </p>
        </section>
      </main>
    </div>
  );
}
