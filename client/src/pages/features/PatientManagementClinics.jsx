import FeaturePageTemplate from './FeaturePageTemplate';

export default function PatientManagementClinics() {
  return (
    <FeaturePageTemplate
      path="/features/patient-management-system-for-clinics"
      title="Patient Management System for Clinics"
      subtitle="Smart & Secure Clinic Patient Management with Appointment, E-Prescription & Billing Integration"
      description="Docsy ERP helps clinics manage complete patient records, appointment history, e-prescriptions, and billing in one secure cloud workflow. Teams spend less time on manual coordination and more time on patient care."
      points={[
        'Centralized patient profile with visit history, prescriptions, and billing timeline.',
        'Faster OPD flow with appointment scheduling, reminders, and queue visibility.',
        'Integrated e-prescription and billing reduces duplicate data entry.',
        'Role-based access keeps patient data secure for doctors and staff.',
        'Actionable reports to track follow-ups, returning patients, and clinic growth.',
        'Works across desktop and mobile for front desk and doctors.',
      ]}
    />
  );
}

