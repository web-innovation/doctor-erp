import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '@/services/api';
import auth from '@/services/auth';
import Header from '@/components/Header';
import Drawer from '@/components/Drawer';
import Footer from '@/components/Footer';
import { PatientTheme } from '@/constants/patientTheme';
import ProfileQuickSwitch from '@/components/ProfileQuickSwitch';

function DoctorCard({ item, onSelect }) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onSelect(item)}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardTag}>{item.specialization || 'General'}</Text>
      </View>
      <Text style={styles.cardSubtitle}>{item.email || 'Available for consultation'}</Text>
    </TouchableOpacity>
  );
}

export default function BookAppointmentScreen() {
  const [doctors, setDoctors] = useState([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [activeClinicLabel, setActiveClinicLabel] = useState('');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDateObj, setSelectedDateObj] = useState(new Date());
  const [type, setType] = useState('CONSULTATION');
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const active = await auth.getActiveProfile();
      setActiveClinicLabel(active?.clinicName || '');
      await loadDoctors();
    })();
  }, []);

  const loadDoctors = async () => {
    setLoading(true);
    try {
      const d = await api.getDoctors();
      if (d && typeof d === 'object' && Array.isArray(d.data)) setDoctors(d.data || []);
      else if (Array.isArray(d)) setDoctors(d || []);
      else setDoctors([]);
    } catch {
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!selectedDoctor) return Alert.alert('Select a doctor');
    if (!date || !timeSlot) return Alert.alert('Provide date and time');
    const chosen = new Date(`${date}T${timeSlot}:00`);
    if (chosen < new Date()) return Alert.alert('Invalid time', 'Appointment time cannot be in the past');

    const payload = { patientId: 'me', doctorId: selectedDoctor.id, date, timeSlot, type, symptoms };
    try {
      await api.bookAppointment(payload);
      Alert.alert('Requested', 'Appointment requested and sent for review');
      router.push('/(tabs)/appointments');
    } catch {
      Alert.alert('Error', 'Failed to book appointment');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Book Appointment" onMenu={() => setDrawerVisible(true)} rightIcon="arrow.clockwise" onRight={loadDoctors} />
      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />

      <View style={styles.container}>
        <ProfileQuickSwitch onChanged={async () => {
          setSelectedDoctor(null);
          await loadDoctors();
        }} />
        <View style={styles.contextStrip}>
          <Text style={styles.contextLabel}>Clinic</Text>
          <Text style={styles.contextValue}>{activeClinicLabel || 'Select from menu -> Switch Patient/Clinic'}</Text>
        </View>

        {!selectedDoctor ? (
          <>
            <Text style={styles.title}>Step 1: Select Doctor</Text>
            <FlatList
              data={doctors}
              keyExtractor={(d) => String(d.id)}
              renderItem={({ item }) => <DoctorCard item={item} onSelect={setSelectedDoctor} />}
              ListEmptyComponent={
                <Text style={styles.empty}>{loading ? 'Loading doctors...' : 'No doctors mapped to selected clinic.'}</Text>
              }
            />
          </>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
            <Text style={styles.title}>Step 2: Appointment Details</Text>
            <View style={styles.selectedDoctor}>
              <Text style={styles.selectedDoctorName}>{selectedDoctor.name}</Text>
              <Text style={styles.selectedDoctorMeta}>{selectedDoctor.specialization || 'General Consultation'}</Text>
            </View>

            <Text style={styles.fieldLabel}>Date</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.inputBtn}>
              <Text style={styles.inputBtnText}>{date || 'Select date'}</Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Time</Text>
            <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.inputBtn}>
              <Text style={styles.inputBtnText}>{timeSlot || 'Select time'}</Text>
            </TouchableOpacity>

            {showDatePicker ? (
              <DateTimePicker
                value={selectedDateObj}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date()}
                onChange={(_e, d) => {
                  setShowDatePicker(false);
                  if (!d) return;
                  setSelectedDateObj(d);
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  setDate(`${y}-${m}-${day}`);
                }}
              />
            ) : null}

            {showTimePicker ? (
              <DateTimePicker
                value={selectedDateObj}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                is24Hour={true}
                onChange={(_e, d) => {
                  setShowTimePicker(false);
                  if (!d) return;
                  const hh = String(d.getHours()).padStart(2, '0');
                  const mm = String(d.getMinutes()).padStart(2, '0');
                  setTimeSlot(`${hh}:${mm}`);
                }}
              />
            ) : null}

            <Text style={styles.fieldLabel}>Appointment Type</Text>
            <View style={styles.segmentWrap}>
              <TouchableOpacity
                style={[styles.segmentBtn, type === 'CONSULTATION' ? styles.segmentActive : null]}
                onPress={() => setType('CONSULTATION')}
              >
                <Text style={[styles.segmentText, type === 'CONSULTATION' ? styles.segmentTextActive : null]}>
                  Consultation
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentBtn, type === 'FOLLOWUP' ? styles.segmentActive : null]}
                onPress={() => setType('FOLLOWUP')}
              >
                <Text style={[styles.segmentText, type === 'FOLLOWUP' ? styles.segmentTextActive : null]}>
                  Followup
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Symptoms / Notes</Text>
            <TextInput
              value={symptoms}
              onChangeText={setSymptoms}
              placeholder="Describe symptoms"
              placeholderTextColor={PatientTheme.colors.textMuted}
              style={styles.notes}
              multiline
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={submit}>
              <Text style={styles.primaryBtnText}>Request Appointment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setSelectedDoctor(null)}>
              <Text style={styles.secondaryBtnText}>Change Doctor</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: PatientTheme.colors.bg },
  contextStrip: {
    borderWidth: 1,
    borderColor: PatientTheme.colors.border,
    backgroundColor: PatientTheme.colors.surface,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  contextLabel: { fontSize: 12, color: PatientTheme.colors.textMuted },
  contextValue: { fontSize: 14, fontWeight: '700', color: PatientTheme.colors.text, marginTop: 3 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 10, color: PatientTheme.colors.text },
  card: {
    backgroundColor: PatientTheme.colors.surface,
    borderWidth: 1,
    borderColor: PatientTheme.colors.border,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: PatientTheme.colors.text },
  cardTag: {
    backgroundColor: PatientTheme.colors.primarySoft,
    color: PatientTheme.colors.primary,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '700',
  },
  cardSubtitle: { marginTop: 8, color: PatientTheme.colors.textMuted, fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 20, color: PatientTheme.colors.textMuted },
  selectedDoctor: {
    backgroundColor: PatientTheme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PatientTheme.colors.border,
    padding: 12,
    marginBottom: 10,
  },
  selectedDoctorName: { fontSize: 16, fontWeight: '700', color: PatientTheme.colors.text },
  selectedDoctorMeta: { marginTop: 4, color: PatientTheme.colors.textMuted },
  fieldLabel: { marginTop: 8, marginBottom: 6, color: PatientTheme.colors.text, fontWeight: '600' },
  inputBtn: {
    borderWidth: 1,
    borderColor: PatientTheme.colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: PatientTheme.colors.surface,
  },
  inputBtnText: { color: PatientTheme.colors.text },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: PatientTheme.colors.surfaceSoft,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: PatientTheme.colors.border,
  },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
  segmentActive: { backgroundColor: PatientTheme.colors.primary },
  segmentText: { color: PatientTheme.colors.primary, fontWeight: '600' },
  segmentTextActive: { color: '#fff' },
  notes: {
    borderWidth: 1,
    borderColor: PatientTheme.colors.border,
    borderRadius: 10,
    backgroundColor: PatientTheme.colors.surface,
    minHeight: 92,
    textAlignVertical: 'top',
    padding: 12,
    color: PatientTheme.colors.text,
  },
  primaryBtn: {
    marginTop: 14,
    backgroundColor: PatientTheme.colors.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: PatientTheme.colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: PatientTheme.colors.surface,
  },
  secondaryBtnText: { color: PatientTheme.colors.text, fontWeight: '600' },
});
