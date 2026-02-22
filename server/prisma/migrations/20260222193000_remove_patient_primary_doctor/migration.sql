-- Patients are clinic-level and not permanently linked to a single doctor.
ALTER TABLE "Patient" DROP COLUMN "primaryDoctorId";
