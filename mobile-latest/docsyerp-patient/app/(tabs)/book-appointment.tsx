import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Button, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '@/services/api';
import Header from '@/components/Header';
import Drawer from '@/components/Drawer';
import Footer from '@/components/Footer';

function DoctorCard({ item, onSelect }){
  return (
    <TouchableOpacity style={styles.card} onPress={() => onSelect(item)}>
      <View style={{flexDirection:'row', justifyContent:'space-between'}}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardId}>{item.email || ''}</Text>
      </View>
      <Text style={styles.cardSubtitle}>{item.specialization || ''}</Text>
    </TouchableOpacity>
  );
}

export default function BookAppointmentScreen(){
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [date, setDate] = useState(''); // YYYY-MM-DD
  const [timeSlot, setTimeSlot] = useState(''); // HH:mm
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDateObj, setSelectedDateObj] = useState(null);
  const [type, setType] = useState('CONSULTATION');
  const [symptoms, setSymptoms] = useState('');

  const router = useRouter();

  const load = async () => {
    setLoading(true);
    try{
      const d = await api.getDoctors();
      // api.getDoctors returns either data array or wrapped object
      if (d && typeof d === 'object' && Array.isArray(d.data)) setDoctors(d.data || []);
      else if (Array.isArray(d)) setDoctors(d || []);
      else if (d && Array.isArray(d)) setDoctors(d);
    }catch(e){}
    setLoading(false);
  };

  useEffect(()=>{ let mounted = true; load(); return ()=>{ mounted = false }; }, []);

  const submit = async () => {
    if(!selectedDoctor) return Alert.alert('Select a doctor');
    if(!date || !timeSlot) return Alert.alert('Provide date and time');
    // Validate date/time not in past
    const dtString = `${date}T${timeSlot}:00`;
    const chosen = new Date(dtString);
    const now = new Date();
    if (chosen < now) return Alert.alert('Invalid time', 'Appointment time cannot be in the past');

    const payload = { patientId: 'me', doctorId: selectedDoctor.id, date, timeSlot, type, symptoms };
    try{
      await api.bookAppointment(payload);
      Alert.alert('Requested', 'Appointment requested and sent for review');
      router.push('/(tabs)/appointments');
    }catch(e){
      Alert.alert('Error', 'Failed to book appointment');
    }
  };

  return (
    <View style={{flex:1}}>
      <Header title="Book Appointment" onMenu={() => setDrawerVisible(true)} />
      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={styles.container}>
        {!selectedDoctor ? (
          <>
            <Text style={styles.title}>Choose a doctor</Text>
            <FlatList
              data={doctors}
              keyExtractor={d => String(d.id)}
              renderItem={({item}) => (
                <DoctorCard item={item} onSelect={(d) => setSelectedDoctor(d)} />
              )}
              ListEmptyComponent={<Text style={{textAlign:'center', marginTop:20}}>No doctors available.</Text>}
            />
          </>
        ) : (
            <View>
            <Text style={styles.title}>Booking for {selectedDoctor.name}</Text>
            <Text style={{marginTop:8}}>Date</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.input, {justifyContent:'center'}]}>
              <Text>{date || 'Select date'}</Text>
            </TouchableOpacity>
            <Text style={{marginTop:8}}>Time</Text>
            <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[styles.input, {justifyContent:'center'}]}>
              <Text>{timeSlot || 'Select time'}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={selectedDateObj || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date()}
                onChange={(e, d) => {
                  setShowDatePicker(false);
                  if (d) {
                    const y = d.getFullYear();
                    const m = String(d.getMonth()+1).padStart(2,'0');
                    const day = String(d.getDate()).padStart(2,'0');
                    setDate(`${y}-${m}-${day}`);
                    setSelectedDateObj(d);
                  }
                }}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={selectedDateObj || new Date()}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                is24Hour={true}
                onChange={(e, d) => {
                  setShowTimePicker(false);
                  if (d) {
                    const hh = String(d.getHours()).padStart(2,'0');
                    const mm = String(d.getMinutes()).padStart(2,'0');
                    setTimeSlot(`${hh}:${mm}`);
                    setSelectedDateObj(d);
                  }
                }}
              />
            )}
            <Text style={{marginTop:8}}>Type</Text>
            <View style={{flexDirection:'row', marginTop:8}}>
              <Button title="Consult" onPress={() => setType('CONSULTATION')} color={type==='CONSULTATION' ? undefined : '#999'} />
              <View style={{width:8}} />
              <Button title="Followup" onPress={() => setType('FOLLOWUP')} color={type==='FOLLOWUP' ? undefined : '#999'} />
            </View>
            <Text style={{marginTop:12}}>Symptoms / Notes</Text>
            <TextInput value={symptoms} onChangeText={setSymptoms} placeholder="Describe symptoms" style={[styles.input, {height:100}]} multiline />
            <View style={{height:12}} />
            <Button title="Request Appointment" onPress={submit} />
            <View style={{height:8}} />
            <Button title="Back" onPress={() => setSelectedDoctor(null)} color="#666" />
          </View>
        )}
      </View>
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 10, marginVertical: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSubtitle: { marginTop: 6, color: '#666' },
  cardId: { color: '#666' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginTop: 6 }
});
