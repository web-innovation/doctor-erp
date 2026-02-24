import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import auth from '@/services/auth';
import { PatientTheme } from '@/constants/patientTheme';

export default function OtpScreen(){
  const { mobile } = useLocalSearchParams();
  const router = useRouter();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if(otp.length === 4){
      (async () => {
        setLoading(true);
        try{
          const res = await auth.verifyOtp(mobile, otp);
          if(res && res.token){
            const boot = await auth.bootstrapPatientProfiles();
            if ((boot?.profiles || []).length > 1) {
              router.replace('/select-profile' as any);
            } else {
              router.replace('/(tabs)');
            }
          } else {
            Alert.alert('Invalid OTP');
          }
        }catch{
          Alert.alert('OTP verification failed');
        }finally{ setLoading(false); setOtp(''); }
      })();
    }
  }, [otp, mobile, router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.info}>We sent a 4-digit code to the email registered with your clinic for {mobile}</Text>
      <TextInput
        value={otp}
        onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, '').slice(0,4))}
        keyboardType="number-pad"
        style={styles.input}
        maxLength={4}
        autoFocus
      />
      <Text style={styles.hint}>{loading ? 'Verifying...' : ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, padding: 24, backgroundColor: PatientTheme.colors.bg, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 8, color: PatientTheme.colors.text },
  info: { fontSize: 14, textAlign: 'center', color: PatientTheme.colors.textMuted, marginBottom: 16 },
  input: {
    alignSelf: 'center',
    fontSize: 28,
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: PatientTheme.colors.border,
    padding: 12,
    width: 180,
    textAlign: 'center',
    borderRadius: 12,
    backgroundColor: PatientTheme.colors.surface,
    color: PatientTheme.colors.text,
  },
  hint: { textAlign: 'center', marginTop: 12 }
});
