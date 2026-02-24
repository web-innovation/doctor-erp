import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import api from '@/services/api';
import Header from '@/components/Header';
import Drawer from '@/components/Drawer';
import Footer from '@/components/Footer';
import { PatientTheme } from '@/constants/patientTheme';
import ProfileQuickSwitch from '@/components/ProfileQuickSwitch';

function parseVitals(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return null;
}

function buildVitals(vitals) {
  if (!vitals) return [];
  const map = [
    { key: 'bp', label: 'BP', value: vitals.bp || vitals.bloodPressure || vitals.blood_pressure },
    { key: 'pulse', label: 'Pulse', value: vitals.pulse || vitals.heartRate || vitals.heart_rate },
    { key: 'temp', label: 'Temp', value: vitals.temp || vitals.temperature },
    { key: 'spo2', label: 'SpO2', value: vitals.spo2 || vitals.oxygenSaturation || vitals.oxygen_saturation },
    { key: 'weight', label: 'Wt', value: vitals.weight },
  ];
  return map.filter((x) => x.value !== undefined && x.value !== null && String(x.value).trim() !== '').slice(0, 4);
}

function PrescriptionCard({ item, onPress }) {
  const dt = item.date ? new Date(item.date) : null;
  const dateLabel = dt ? `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Date not available';
  const doctorName = item?.doctor?.name || item?.doctorName || 'Doctor not mapped';
  const vitals = buildVitals(parseVitals(item?.vitalsSnapshot));
  const medCount = Array.isArray(item?.medicines) ? item.medicines.length : 0;
  const testCount = Array.isArray(item?.labTests) ? item.labTests.length : 0;

  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardId}>{item.prescriptionNo || 'Prescription'}</Text>
        <Text style={styles.dateText}>{dateLabel}</Text>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.doctorBadge}>
          <Text style={styles.doctorBadgeText}>Dr. {doctorName}</Text>
        </View>
        <Text style={styles.countText}>Medicines {medCount} | Tests {testCount}</Text>
      </View>

      {vitals.length > 0 ? (
        <View style={styles.vitalsRow}>
          {vitals.map((v) => (
            <View key={v.key} style={styles.vitalPill}>
              <Text style={styles.vitalLabel}>{v.label}</Text>
              <Text style={styles.vitalValue}>{String(v.value)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.noVitals}>Vitals not recorded</Text>
      )}

      <Text style={styles.notes} numberOfLines={2}>
        {item.clinicalNotes || item.advice || 'No clinical notes'}
      </Text>
    </TouchableOpacity>
  );
}

export default function PrescriptionsScreen() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const router = useRouter();

  const loadPage = async (pageNum = 1) => {
    try {
      const res = await api.getPrescriptions('me', pageNum, 10);
      let items = [];
      let pagination = null;
      if (res && typeof res === 'object' && Array.isArray(res.data)) {
        items = res.data;
        pagination = res.pagination || null;
      } else if (Array.isArray(res)) {
        items = res;
      }

      if (pageNum === 1) setPrescriptions(items || []);
      else setPrescriptions((prev) => [...prev, ...(items || [])]);

      if (pagination) {
        setPage(pagination.page || pageNum);
        setTotalPages(pagination.totalPages || 1);
      } else {
        setPage(pageNum);
        setTotalPages(items && items.length < 10 ? pageNum : Math.max(pageNum, 1));
      }
    } catch {}
  };

  useEffect(() => { loadPage(1); }, []);

  return (
    <View style={{ flex: 1 }}>
      <Header title="Prescriptions" onMenu={() => setDrawerVisible(true)} rightIcon="arrow.clockwise" onRight={() => loadPage(1)} />
      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={styles.container}>
        <ProfileQuickSwitch onChanged={() => loadPage(1)} />
        <FlatList
          data={prescriptions}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <PrescriptionCard item={item} onPress={() => router.push(`/(tabs)/prescriptions/${item.id}`)} />
          )}
          onEndReached={() => {
            if (!loadingMore && page < totalPages) {
              const next = page + 1;
              setLoadingMore(true);
              (async () => {
                await loadPage(next);
                setLoadingMore(false);
              })();
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <Text style={styles.loadingMore}>Loading more...</Text> : null}
          ListEmptyComponent={<Text style={styles.empty}>No prescriptions found.</Text>}
        />
      </View>
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14, backgroundColor: PatientTheme.colors.bg },
  card: {
    backgroundColor: PatientTheme.colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: PatientTheme.colors.border,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardId: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    backgroundColor: PatientTheme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dateText: { fontSize: 12, color: PatientTheme.colors.textMuted, marginLeft: 10, flexShrink: 1, textAlign: 'right' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  doctorBadge: { backgroundColor: '#e8f6f7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  doctorBadgeText: { color: '#0a7376', fontWeight: '700', fontSize: 12 },
  countText: { fontSize: 12, color: PatientTheme.colors.textMuted, fontWeight: '600' },
  vitalsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 6 },
  vitalPill: { backgroundColor: PatientTheme.colors.primarySoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  vitalLabel: { fontSize: 10, color: PatientTheme.colors.primary, fontWeight: '700' },
  vitalValue: { fontSize: 12, color: PatientTheme.colors.text, fontWeight: '700' },
  noVitals: { marginTop: 10, fontSize: 12, color: PatientTheme.colors.textMuted, fontStyle: 'italic' },
  notes: { marginTop: 10, color: PatientTheme.colors.text, lineHeight: 18 },
  loadingMore: { textAlign: 'center', padding: 12, color: PatientTheme.colors.textMuted },
  empty: { textAlign: 'center', marginTop: 20, color: PatientTheme.colors.textMuted },
});
