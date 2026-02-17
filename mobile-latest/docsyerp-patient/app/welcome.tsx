import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function Welcome() {
  const router = useRouter();

  useEffect(() => {
    // show message briefly then navigate to login
    const t = setTimeout(() => {
      router.replace('/login');
    }, 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.wrapper}>
      <View style={styles.toast}>
        <Text style={styles.msg}>You have been logged out</Text>
        <Text style={styles.sub}>Redirecting to login…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex:1, alignItems:'center', justifyContent:'center', backgroundColor:'#fff' },
  toast: { backgroundColor:'#111', padding:14, borderRadius:10, opacity:0.95, alignItems:'center' },
  msg: { color:'#fff', fontWeight:'700', fontSize:16 },
  sub: { color:'#ddd', marginTop:6 }
});
