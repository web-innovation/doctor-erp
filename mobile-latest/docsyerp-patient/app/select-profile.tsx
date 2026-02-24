import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import auth from '@/services/auth';
import { PatientTheme } from '@/constants/patientTheme';

function ProfileCard({ item, active, onPress }) {
  return (
    <TouchableOpacity style={[styles.card, active ? styles.cardActive : null]} onPress={() => onPress(item)}>
      <View style={styles.cardRow}>
        <Text style={styles.cardName}>{item.name || 'Patient'}</Text>
        {active ? <Text style={styles.activeTag}>Active</Text> : null}
      </View>
      <Text style={styles.cardMeta}>ID: {item.displayId || item.code || item.id}</Text>
      <Text style={styles.cardMeta}>Clinic: {item.clinicName || item?.clinic?.name || 'Unknown clinic'}</Text>
    </TouchableOpacity>
  );
}

export default function SelectProfileScreen() {
  const router = useRouter();
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const localProfiles = await auth.getPatientProfiles();
        const localActive = await auth.getActiveProfile();
        if (!localProfiles?.length) {
          const boot = await auth.bootstrapPatientProfiles();
          setProfiles(boot?.profiles || []);
          setActiveProfile(boot?.defaultProfile || null);
          return;
        }
        setProfiles(localProfiles);
        setActiveProfile(localActive);
      } catch {
        Alert.alert('Error', 'Unable to load patient profiles');
      }
    })();
  }, []);

  const onSelect = async (profile) => {
    await auth.setActiveProfile(profile);
    setActiveProfile(profile);
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Patient & Clinic</Text>
      <Text style={styles.subtitle}>Select the profile you want to use in this session.</Text>

      <FlatList
        data={profiles}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ProfileCard
            item={item}
            active={activeProfile?.id === item.id}
            onPress={onSelect}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No linked patient profiles found.</Text>}
      />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.replace('/(tabs)')}
      >
        <Text style={styles.backButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PatientTheme.colors.bg,
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '700', color: PatientTheme.colors.text },
  subtitle: { marginTop: 6, marginBottom: 12, fontSize: 14, color: PatientTheme.colors.textMuted },
  card: {
    backgroundColor: PatientTheme.colors.surface,
    borderWidth: 1,
    borderColor: PatientTheme.colors.border,
    borderRadius: PatientTheme.radius.lg,
    padding: 14,
    marginBottom: 10,
  },
  cardActive: {
    borderColor: PatientTheme.colors.primary,
    backgroundColor: PatientTheme.colors.primarySoft,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { fontSize: 16, fontWeight: '700', color: PatientTheme.colors.text },
  activeTag: {
    fontSize: 11,
    color: PatientTheme.colors.primary,
    fontWeight: '700',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  cardMeta: { marginTop: 4, fontSize: 13, color: PatientTheme.colors.textMuted },
  empty: { marginTop: 20, textAlign: 'center', color: PatientTheme.colors.textMuted },
  backButton: {
    marginTop: 8,
    backgroundColor: PatientTheme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  backButtonText: { color: '#fff', fontWeight: '700' },
});
