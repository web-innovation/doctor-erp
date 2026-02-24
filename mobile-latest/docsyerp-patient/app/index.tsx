import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import auth from '@/services/auth';
import { PatientTheme } from '@/constants/patientTheme';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const token = await auth.getToken();
      if (!mounted) return;

      if (!token) {
        router.replace('/login');
        return;
      }

      try {
        const profiles = await auth.getPatientProfiles();
        const active = await auth.getActiveProfile();
        if ((profiles || []).length > 1 && !active) {
          router.replace('/select-profile' as any);
          return;
        }
      } catch {}

      router.replace('/(tabs)');
    })();

    return () => { mounted = false; };
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Docsy Patient</Text>
      <Text style={styles.subtitle}>Connecting your care records...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PatientTheme.colors.bg },
  title: { fontSize: 30, fontWeight: '800', marginBottom: 6, color: PatientTheme.colors.primary },
  subtitle: { fontSize: 14, color: PatientTheme.colors.textMuted }
});
