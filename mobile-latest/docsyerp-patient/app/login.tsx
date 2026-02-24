import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Linking, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import auth from '@/services/auth';
import { PatientTheme } from '@/constants/patientTheme';

export default function Login() {
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const doRequestOtp = async () => {
    if(!mobile || mobile.length < 6){
      Alert.alert('Enter a valid mobile number');
      return;
    }
    setLoading(true);
    try{
      await auth.requestOtp(mobile);
      router.push(`/otp?mobile=${encodeURIComponent(mobile)}`);
    }catch{
      Alert.alert('Could not request OTP');
    }finally{ setLoading(false); }
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>Patient Login</Text>
        <Text style={styles.info}>
          Enter your mobile number. A one-time code will be sent to the email registered with your clinic.
        </Text>
        <TextInput
          placeholder="Mobile number"
          value={mobile}
          onChangeText={setMobile}
          style={styles.input}
          keyboardType="phone-pad"
        />
        <View style={styles.buttonWrap}>
          <Button title={loading ? 'Requesting OTP...' : 'Send OTP'} onPress={doRequestOtp} disabled={loading} />
        </View>
        <View style={styles.privacyWrap}>
          <TouchableOpacity onPress={() => Linking.openURL('https://docsyerp.in/privacy') }>
            <Text style={styles.privacyLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, padding: 16, justifyContent:'center', backgroundColor: PatientTheme.colors.bg },
  form: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    padding: 20,
    borderRadius: 16,
    backgroundColor: PatientTheme.colors.surface,
    borderWidth: 1,
    borderColor: PatientTheme.colors.border,
  },
  title: { fontSize: 24, marginBottom: 8, textAlign: 'center', fontWeight: '700', color: PatientTheme.colors.text },
  info: { fontSize: 14, color: PatientTheme.colors.textMuted, marginBottom: 16, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: PatientTheme.colors.border,
    padding: 12,
    marginBottom: 12,
    borderRadius: 10,
    fontSize: 18,
    backgroundColor: PatientTheme.colors.surfaceSoft,
    color: PatientTheme.colors.text,
  },
  buttonWrap: { marginTop: 8 }
  ,privacyWrap: { marginTop: 12, alignItems: 'center' },
  privacyLink: { color: PatientTheme.colors.primary, textDecorationLine: 'underline' }
});
