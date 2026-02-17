import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api from '@/services/api';
import Header from '@/components/Header';
import Drawer from '@/components/Drawer';
import Footer from '@/components/Footer';

export default function AppointmentDetail(){
  const { id } = useLocalSearchParams();
  const [appointment, setAppointment] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    if(!id) return;
    api.getAppointment(id).then(d => { if(mounted) setAppointment(d); }).catch(()=>{});
    return () => { mounted = false; };
  }, [id]);

  if(!appointment) return <View style={styles.container}><Text style={{padding:16}}>Loading appointment...</Text></View>;

  return (
    <View style={{flex:1}}>
      <Header title={`Appointment`} onMenu={() => setDrawerVisible(true)} />
      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <ScrollView style={styles.container} contentContainerStyle={{padding:16}}>
        <Text style={styles.label}>Date & Time</Text>
        <Text style={styles.value}>{appointment.date ? new Date(appointment.date).toLocaleDateString() : '-' } {appointment.timeSlot ? `· ${(() => { const ts = String(appointment.timeSlot).split('-')[0].trim(); const [h,m] = ts.split(':'); const hh = parseInt(h,10); const ampm = hh >= 12 ? 'PM' : 'AM'; const hh12 = (hh % 12) === 0 ? 12 : hh % 12; return `${hh12}:${m} ${ampm}` })()}` : (appointment.date ? `· ${new Date(appointment.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` : '')}</Text>

        <Text style={styles.label}>Doctor</Text>
        <Text style={styles.value}>{appointment.doctor?.name || appointment.doctorName || '-'}</Text>

        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{appointment.status || '-'}</Text>

        <Text style={styles.label}>Notes</Text>
        <Text style={styles.value}>{appointment.notes || '-'}</Text>
      </ScrollView>
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#fff' },
  label: { marginTop:12, fontWeight:'700' },
  value: { marginTop:6 }
});
