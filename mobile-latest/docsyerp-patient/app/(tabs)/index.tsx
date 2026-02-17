import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Header from '@/components/Header';
import Drawer from '@/components/Drawer';
import Footer from '@/components/Footer';

export default function HomeScreen() {
  const router = useRouter();
  const [drawerVisible, setDrawerVisible] = useState(false);

  return (
    <View style={{flex:1}}>
      <Header title="Docsy Patient" onMenu={() => setDrawerVisible(true)} />
      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={styles.container}>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/appointments')}>
          <Text style={styles.cardTitle}>My Appointments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/prescriptions')}>
          <Text style={styles.cardTitle}>Prescriptions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/bills')}>
          <Text style={styles.cardTitle}>My Bills</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/book-appointment')}>
          <Text style={styles.cardTitle}>Book Appointment</Text>
        </TouchableOpacity>
      </View>
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f7f9fb' },
  title: { fontSize: 22, marginBottom: 12, fontWeight: '700', textAlign: 'center' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 10, marginVertical: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 },
  cardTitle: { fontSize: 16, fontWeight: '600' }
});
