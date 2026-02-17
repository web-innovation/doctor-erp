import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import auth from '@/services/auth';

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
            router.replace('/(tabs)');
          } else {
            Alert.alert('Invalid OTP');
          }
        }catch(e){
          Alert.alert('OTP verification failed');
        }finally{ setLoading(false); setOtp(''); }
      })();
    }
  }, [otp]);

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
  container: { flex:1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 20, textAlign: 'center', marginBottom: 8 },
  info: { fontSize: 14, textAlign: 'center', color: '#444', marginBottom: 16 },
  input: { alignSelf: 'center', fontSize: 28, letterSpacing: 8, borderWidth: 1, borderColor: '#ddd', padding: 12, width: 180, textAlign: 'center', borderRadius: 8, backgroundColor: '#fff' },
  hint: { textAlign: 'center', marginTop: 12 }
});
