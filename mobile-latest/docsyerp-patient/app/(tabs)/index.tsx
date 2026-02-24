import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Header from '@/components/Header';
import Drawer from '@/components/Drawer';
import Footer from '@/components/Footer';
import auth from '@/services/auth';
import { PatientTheme } from '@/constants/patientTheme';

export default function HomeScreen() {
  const router = useRouter();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [clinicName, setClinicName] = useState('');

  React.useEffect(() => {
    (async () => {
      const active = await auth.getActiveProfile();
      setProfileName(active?.name || 'Patient');
      setClinicName(active?.clinicName || '');
    })();
  }, []);

  return (
    <View style={{flex:1}}>
      <Header title="Docsy Patient" onMenu={() => setDrawerVisible(true)} />
      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Hello, {profileName}</Text>
          <Text style={styles.heroText}>{clinicName || 'Select your clinic profile from menu if needed.'}</Text>
        </View>
        <TouchableOpacity style={[styles.card, styles.primaryCard]} onPress={() => router.push('/(tabs)/book-appointment')}>
          <Text style={[styles.cardTitle, styles.primaryTitle]}>Book Appointment</Text>
          <Text style={styles.primarySub}>Choose clinic doctor and request instantly</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/appointments')}>
          <Text style={styles.cardTitle}>My Appointments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/prescriptions')}>
          <Text style={styles.cardTitle}>Prescriptions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/bills')}>
          <Text style={styles.cardTitle}>My Bills</Text>
        </TouchableOpacity>
      </View>
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: PatientTheme.colors.bg },
  hero: {
    backgroundColor: PatientTheme.colors.surface,
    borderWidth: 1,
    borderColor: PatientTheme.colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  heroTitle: { fontSize: 22, fontWeight: '700', color: PatientTheme.colors.text },
  heroText: { fontSize: 13, color: PatientTheme.colors.textMuted, marginTop: 4 },
  card: {
    backgroundColor: PatientTheme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: PatientTheme.colors.border,
  },
  primaryCard: {
    backgroundColor: PatientTheme.colors.primary,
    borderColor: PatientTheme.colors.primary,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: PatientTheme.colors.text },
  primaryTitle: { color: '#fff' },
  primarySub: { color: '#d6e8fa', marginTop: 6, fontSize: 13 },
});
