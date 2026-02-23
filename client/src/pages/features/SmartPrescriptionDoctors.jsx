import FeaturePageTemplate from './FeaturePageTemplate';

export default function SmartPrescriptionDoctors() {
  return (
    <FeaturePageTemplate
      path="/features/smart-prescription-software-for-doctors"
      title="Smart Prescription Software for Doctors"
      subtitle="Digital prescription software for doctors with dosage templates, medicine search, and quick patient-friendly print/PDF output."
      description="Docsy ERP helps doctors generate clear, digital, and error-free prescriptions faster. It improves OPD consultation speed, reduces handwriting confusion, and keeps records linked with patient history and billing."
      primaryKeyword="Smart prescription software for doctors"
      secondaryKeywords={[
        'Digital prescription software',
        'Clinic e-prescription system',
        'Doctor prescription app'
      ]}
      points={[
        'Digital prescriptions improve readability and reduce handwriting errors.',
        'Quick medicine and dosage selection speeds up consultation workflow.',
        'Standardized prescription templates for consistent clinical practice.',
        'Instant sharing with patients through print, PDF, and digital channels.',
        'Integrated with patient history for better follow-up continuity.',
        'Works alongside billing and pharmacy modules for complete clinic flow.',
      ]}
      modules={[
        'Medicine search and template shortcuts',
        'Dosage and frequency presets',
        'Printable and shareable prescriptions',
        'Linked patient consultation history',
        'Follow-up tracking support',
        'Prescription to billing/pharmacy integration'
      ]}
      industries={[
        'General physicians',
        'Speciality consultants',
        'Multi-doctor clinics',
        'Day-care and OPD centers'
      ]}
      faqs={[
        {
          q: 'Can doctors create and print prescriptions quickly during OPD rush?',
          a: 'Yes. Predefined dosage patterns and medicine search reduce writing time significantly.'
        },
        {
          q: 'Can prescriptions be shared digitally with patients?',
          a: 'Yes. Prescriptions can be printed or shared as digital records, including PDF workflows.'
        },
        {
          q: 'Does this connect with billing and pharmacy?',
          a: 'Yes. Prescription data connects with billing and pharmacy modules to reduce duplicate entry.'
        }
      ]}
    />
  );
}

