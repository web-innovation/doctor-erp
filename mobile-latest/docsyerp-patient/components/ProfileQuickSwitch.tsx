import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, FlatList } from 'react-native';
import auth from '@/services/auth';
import { PatientTheme } from '@/constants/patientTheme';

export default function ProfileQuickSwitch({ onChanged }: { onChanged?: () => void }) {
  const [active, setActive] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const loadProfiles = async () => {
    const list = await auth.getPatientProfiles();
    const current = await auth.getActiveProfile();
    setProfiles(list || []);
    setActive(current || null);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const onSelect = async (profile: any) => {
    await auth.setActiveProfile(profile);
    setActive(profile);
    setOpen(false);
    onChanged && onChanged();
  };

  return (
    <>
      <TouchableOpacity style={styles.bar} onPress={() => setOpen(true)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{active?.name || 'Select patient'}</Text>
          <Text style={styles.meta}>{active?.clinicName || active?.clinic?.name || 'Unknown clinic'}</Text>
        </View>
        <Text style={styles.cta}>Change</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Choose Patient & Clinic</Text>
            <FlatList
              data={profiles}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => {
                const isActive = active?.id === item.id;
                return (
                  <TouchableOpacity style={[styles.row, isActive ? styles.rowActive : null]} onPress={() => onSelect(item)}>
                    <Text style={styles.rowName}>{item.name}</Text>
                    <Text style={styles.rowMeta}>{item.patientId || item.id}</Text>
                    <Text style={styles.rowClinic}>{item.clinicName || item?.clinic?.name || 'Unknown clinic'}</Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.empty}>No linked profiles found.</Text>}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: PatientTheme.colors.surface,
    borderColor: PatientTheme.colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: { fontSize: 14, fontWeight: '700', color: PatientTheme.colors.text },
  meta: { fontSize: 12, color: PatientTheme.colors.textMuted, marginTop: 2 },
  cta: { color: PatientTheme.colors.primary, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  sheet: { backgroundColor: PatientTheme.colors.surface, borderRadius: 14, maxHeight: '78%', padding: 12 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: PatientTheme.colors.text, marginBottom: 10 },
  row: { padding: 10, borderWidth: 1, borderColor: '#ecf2f8', borderRadius: 10, marginBottom: 8, backgroundColor: '#fbfdff' },
  rowActive: { borderColor: PatientTheme.colors.primary, backgroundColor: PatientTheme.colors.primarySoft },
  rowName: { fontWeight: '700', color: PatientTheme.colors.text },
  rowMeta: { marginTop: 2, fontSize: 12, color: PatientTheme.colors.textMuted },
  rowClinic: { marginTop: 2, fontSize: 12, color: PatientTheme.colors.primary, fontWeight: '600' },
  empty: { textAlign: 'center', color: PatientTheme.colors.textMuted, marginTop: 10 },
  closeBtn: { marginTop: 6, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: PatientTheme.colors.primarySoft },
  closeText: { color: PatientTheme.colors.primary, fontWeight: '700' },
});
