import React from 'react';

export default function PrivacyPolicy(){
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy — DocsyERP Patient App</h1>
      <p className="text-sm text-gray-600 mb-6">Last updated: 2026-02-17</p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">1. Overview</h2>
        <p>The DocsyERP Patient App ("the App") allows patients to request appointments, view prescriptions and billing information. This Privacy Policy explains how the App and clinic backend collect, use, store, and share personal information.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">2. Data Controller / Contact</h2>
        <p>The data controller is the clinic running the DocsyERP service. For privacy questions, contact your clinic administrator or the email provided in the Play Store listing.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">3. Data We Collect</h2>
        <ul className="list-disc pl-5">
          <li>Account & authentication: phone number, email (used for OTP delivery), user name.</li>
          <li>Patient records: patient name, age, gender (if provided), patient ID.</li>
          <li>Appointments: requested dates/times, doctor ID, appointment type, symptoms, notes, status.</li>
          <li>Prescriptions & billing: prescription items, medicine names/dosage, bill amounts, payment status.</li>
          <li>Device & usage: device model, OS version, crash reports, basic analytics for app performance (if enabled).</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">4. How We Use Data</h2>
        <p>We use data to provide core app functionality (booking, showing prescriptions and bills), send OTP codes and notifications, and improve the app through logs and crash reports.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">5. Data Sharing</h2>
        <p>Data is shared only with the clinic and authorized clinic staff. We do not sell personal data to third parties.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">6. Data Storage & Security</h2>
        <p>Patient data is stored on the clinic's backend servers. Clinics should secure servers appropriately (TLS in transit, encryption at rest, access controls). Access is role-based.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">7. User Rights</h2>
        <p>You can request access to, correction of, or deletion of your personal data by contacting your clinic.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">8. Children's Data</h2>
        <p>The app is not designed for children under 13. If the app collects data about minors, parental consent procedures must be followed by the clinic.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">9. International Transfers</h2>
        <p>Data may be stored and processed in the clinic's hosting region. Clinics operating across borders should ensure compliance with local laws.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">10. Changes to this Policy</h2>
        <p>Clinics may update this notice. Users will be notified via app or clinic communication.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">11. Hosting the Policy</h2>
        <p>Host this page on your clinic website (HTTPS) and provide the URL in the Play Console Data Safety & Privacy Policy field.</p>
      </section>

    </div>
  );
}
