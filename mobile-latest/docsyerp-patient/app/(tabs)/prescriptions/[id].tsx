import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api from '@/services/api';
import Header from '@/components/Header';
import Drawer from '@/components/Drawer';
import Footer from '@/components/Footer';
import { PatientTheme } from '@/constants/patientTheme';

function safeArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseVitals(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return null;
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function PrescriptionDetail() {
  const { id } = useLocalSearchParams();
  const [prescription, setPrescription] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!id) return;
    setLoading(true);
    api.getPrescription(id)
      .then((data) => { if (mounted) setPrescription(data); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  const diagnosis = safeArray(prescription?.diagnosis);
  const symptoms = safeArray(prescription?.symptoms);
  const vitals = useMemo(() => parseVitals(prescription?.vitalsSnapshot), [prescription]);
  const medicines = Array.isArray(prescription?.medicines) ? prescription.medicines : [];
  const labTests = Array.isArray(prescription?.labTests) ? prescription.labTests : [];
  const dateText = prescription?.date ? new Date(prescription.date).toLocaleString() : '-';
  const doctorName = prescription?.doctor?.name || prescription?.doctorName || '-';

  return (
    <View style={{ flex: 1 }}>
      <Header title="Prescription Detail" onMenu={() => setDrawerVisible(true)} />
      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={PatientTheme.colors.primary} />
            <Text style={styles.loadingText}>Loading prescription...</Text>
          </View>
        ) : !prescription ? (
          <View style={styles.center}>
            <Text style={styles.loadingText}>Prescription not found.</Text>
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <View style={styles.heroHeader}>
                <Text style={styles.rxNo}>{prescription.prescriptionNo || 'Prescription'}</Text>
                <Text style={styles.date}>{dateText}</Text>
              </View>
              <Text style={styles.heroName}>{prescription?.patient?.name || '-'}</Text>
              <Text style={styles.heroDoctor}>Dr. {doctorName}</Text>
            </View>

            <Section title="Vitals at Consultation">
              {vitals ? (
                <View style={styles.vitalsGrid}>
                  {Object.entries(vitals).map(([key, value]) => (
                    <View key={key} style={styles.vitalItem}>
                      <Text style={styles.vitalKey}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
                      <Text style={styles.vitalVal}>{String(value)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.muted}>Vitals were not recorded.</Text>
              )}
            </Section>

            <Section title="Symptoms">
              {symptoms.length ? (
                symptoms.map((s, idx) => <Text key={`${s}-${idx}`} style={styles.bulletText}>• {String(s)}</Text>)
              ) : (
                <Text style={styles.muted}>No symptoms recorded</Text>
              )}
            </Section>

            <Section title="Diagnosis">
              {diagnosis.length ? (
                diagnosis.map((d, idx) => <Text key={`${d}-${idx}`} style={styles.bulletText}>• {String(d)}</Text>)
              ) : (
                <Text style={styles.muted}>No diagnosis recorded</Text>
              )}
            </Section>

            <Section title={`Medicines (${medicines.length})`}>
              {medicines.length ? medicines.map((m) => (
                <View key={m.id} style={styles.itemRow}>
                  <Text style={styles.itemTitle}>{m.medicineName || 'Medicine'}</Text>
                  <Text style={styles.itemMeta}>
                    {m.dosage || '-'} | {m.frequency || '-'} | Qty {m.quantity || 1}
                  </Text>
                  {m.instructions ? <Text style={styles.itemHint}>{m.instructions}</Text> : null}
                </View>
              )) : <Text style={styles.muted}>No medicines prescribed</Text>}
            </Section>

            <Section title={`Lab Tests (${labTests.length})`}>
              {labTests.length ? labTests.map((t) => (
                <View key={t.id} style={styles.itemRow}>
                  <Text style={styles.itemTitle}>{t.testName || 'Lab test'}</Text>
                  {t.lab?.name ? <Text style={styles.itemMeta}>Lab: {t.lab.name}</Text> : null}
                  {t.instructions ? <Text style={styles.itemHint}>{t.instructions}</Text> : null}
                </View>
              )) : <Text style={styles.muted}>No lab tests advised</Text>}
            </Section>

            <Section title="Clinical Notes">
              <Text style={styles.notes}>{prescription.clinicalNotes || prescription.advice || 'No notes added'}</Text>
            </Section>
          </>
        )}
      </ScrollView>
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PatientTheme.colors.bg },
  content: { padding: 14, paddingBottom: 20 },
  center: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  loadingText: { marginTop: 10, color: PatientTheme.colors.textMuted },

  hero: {
    backgroundColor: PatientTheme.colors.primary,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rxNo: { color: '#fff', fontWeight: '800', fontSize: 13, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  date: { color: '#e2edf8', fontSize: 12, marginLeft: 8, flexShrink: 1, textAlign: 'right' },
  heroName: { color: '#fff', fontWeight: '800', fontSize: 22, marginTop: 12 },
  heroDoctor: { color: '#d8e8f7', fontSize: 14, marginTop: 4 },

  section: {
    backgroundColor: PatientTheme.colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: PatientTheme.colors.border,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: PatientTheme.colors.text, marginBottom: 8 },
  muted: { color: PatientTheme.colors.textMuted, fontStyle: 'italic' },
  bulletText: { color: PatientTheme.colors.text, marginBottom: 4 },

  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vitalItem: { backgroundColor: PatientTheme.colors.primarySoft, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, minWidth: '47%' },
  vitalKey: { fontSize: 11, color: PatientTheme.colors.primary, fontWeight: '700' },
  vitalVal: { marginTop: 3, fontSize: 14, color: PatientTheme.colors.text, fontWeight: '700' },

  itemRow: { borderWidth: 1, borderColor: '#e9eef4', backgroundColor: '#fbfdff', borderRadius: 10, padding: 10, marginBottom: 8 },
  itemTitle: { fontWeight: '700', color: PatientTheme.colors.text },
  itemMeta: { marginTop: 3, color: PatientTheme.colors.textMuted, fontSize: 12 },
  itemHint: { marginTop: 4, color: '#166534', fontSize: 12 },
  notes: { color: PatientTheme.colors.text, lineHeight: 19 },
});
