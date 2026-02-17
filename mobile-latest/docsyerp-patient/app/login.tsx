import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import auth from '@/services/auth';

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
    }catch(e){
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, padding: 16, justifyContent:'center', backgroundColor: '#fff' },
  form: { width: '100%', maxWidth: 420, alignSelf: 'center', padding: 20, borderRadius: 12, backgroundColor: '#fff' },
  title: { fontSize: 22, marginBottom: 8, textAlign: 'center', fontWeight: '700' },
  info: { fontSize: 14, color: '#555', marginBottom: 16, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', padding: 12, marginBottom: 12, borderRadius: 8, fontSize: 18, backgroundColor: '#fff' },
  buttonWrap: { marginTop: 8 }
});
