import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api from '@/services/api';
import Header from '@/components/Header';
import Drawer from '@/components/Drawer';
import Footer from '@/components/Footer';

export default function PrescriptionDetail() {
  const { id } = useLocalSearchParams();
  const [prescription, setPrescription] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!id) return;
    api.getPrescription(id).then((data) => { if(mounted) setPrescription(data); }).catch(()=>{});
    return () => { mounted = false; };
  }, [id]);

  if (!prescription) return (
    <View style={styles.container}><Text style={{padding:16}}>Loading prescription...</Text></View>
  );

  return (
    <View style={{flex:1}}>
      <Header title="Prescription" onMenu={() => setDrawerVisible(true)} />
      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <ScrollView style={styles.container} contentContainerStyle={{padding:16}}>
      <Text style={styles.title}>Prescription</Text>
      <Text style={styles.bold}>Date:</Text>
      <Text style={styles.value}>{prescription.date ? new Date(prescription.date).toLocaleString() : 'Unknown'}</Text>

      <Text style={styles.bold}>Patient:</Text>
      <Text style={styles.value}>{prescription.patient?.name || '-'}</Text>

      <Text style={styles.bold}>Diagnosis:</Text>
      <Text style={styles.value}>{prescription.diagnosis ? JSON.stringify(prescription.diagnosis) : '-'}</Text>

      <Text style={styles.bold}>Symptoms:</Text>
      <Text style={styles.value}>{prescription.symptoms ? JSON.stringify(prescription.symptoms) : '-'}</Text>

      <Text style={styles.bold}>Medicines:</Text>
      {Array.isArray(prescription.medicines) && prescription.medicines.length ? (
        prescription.medicines.map((m) => (
          <View key={m.id} style={{marginBottom:8}}>
            <Text style={styles.value}>{m.medicineName} — {m.dosage} — {m.quantity}</Text>
          </View>
        ))
      ) : <Text style={styles.value}>-</Text>}

      <Text style={styles.bold}>Lab Tests:</Text>
      {Array.isArray(prescription.labTests) && prescription.labTests.length ? (
        prescription.labTests.map((t) => (
          <Text key={t.id} style={styles.value}>{t.testName}</Text>
        ))
      ) : <Text style={styles.value}>-</Text>}

      <Text style={styles.bold}>Notes:</Text>
      <Text style={styles.value}>{prescription.clinicalNotes || prescription.advice || '-'}</Text>
      </ScrollView>
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  bold: { marginTop: 10, fontWeight: '700' },
  value: { marginTop: 4, marginBottom: 6 }
});
