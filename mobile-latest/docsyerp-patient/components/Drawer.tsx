import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from './ui/icon-symbol';
import auth from '@/services/auth';
import { useSnackbar } from './Snackbar';
import { PatientTheme } from '@/constants/patientTheme';

export default function Drawer({ visible, onClose }) {
  const router = useRouter();
  const snackbar = useSnackbar();
  const [activeProfile, setActiveProfile] = useState(null);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const profile = await auth.getActiveProfile();
      setActiveProfile(profile || null);
    })();
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.drawer}>
          <Text style={styles.title}>Menu</Text>
          <View style={styles.profileCard}>
            <Text style={styles.profileName}>{activeProfile?.name || 'Patient profile'}</Text>
            <Text style={styles.profileMeta}>
              {activeProfile?.clinicName || 'No clinic selected'}
            </Text>
          </View>
          <TouchableOpacity style={styles.item} onPress={() => { onClose(); router.push('/select-profile' as any); }}>
            <IconSymbol name="list.bullet.rectangle" size={20} color={PatientTheme.colors.primary} />
            <Text style={styles.label}>Switch Patient / Clinic</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={() => { onClose(); router.push('/(tabs)'); }}>
            <IconSymbol name="house.fill" size={20} color={PatientTheme.colors.primary} />
            <Text style={styles.label}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={() => { onClose(); router.push('/(tabs)/book-appointment'); }}>
            <IconSymbol name="calendar.fill" size={20} color={PatientTheme.colors.primary} />
            <Text style={styles.label}>Book Appointment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={() => { onClose(); router.push('/(tabs)/bills'); }}>
            <IconSymbol name="creditcard.fill" size={20} color={PatientTheme.colors.primary} />
            <Text style={styles.label}>Bills</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={() => { onClose(); router.push('/(tabs)/prescriptions'); }}>
            <IconSymbol name="pills.fill" size={20} color={PatientTheme.colors.primary} />
            <Text style={styles.label}>Prescriptions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={() => { onClose(); router.push('/(tabs)/appointments'); }}>
            <IconSymbol name="calendar.fill" size={20} color={PatientTheme.colors.primary} />
            <Text style={styles.label}>Appointments</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={() => {
            Alert.alert('Logout', 'Are you sure you want to logout?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Logout', style: 'destructive', onPress: async () => {
                try{
                  await auth.logout();
                }catch{}
                onClose();
                // Show in-app snackbar and navigate to login
                try{ snackbar && snackbar.show('You have been logged out'); }catch{}
                router.replace('/login');
              }}
            ]);
          }}>
            <IconSymbol name="arrow.right.square" size={20} color={PatientTheme.colors.danger} />
            <Text style={styles.label}>Logout</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'flex-start' },
  drawer: { width: 280, backgroundColor: PatientTheme.colors.surface, padding:16, paddingTop:48, height:'100%' },
  title: { fontSize:18, fontWeight:'700', marginBottom:12, color: PatientTheme.colors.text },
  profileCard: {
    backgroundColor: PatientTheme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: PatientTheme.colors.border,
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  profileName: { fontSize: 14, fontWeight: '700', color: PatientTheme.colors.text },
  profileMeta: { fontSize: 12, color: PatientTheme.colors.textMuted, marginTop: 2 },
  item: { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:12, borderBottomWidth: 1, borderBottomColor: '#f0f4f8' },
  label: { marginLeft:10, color: PatientTheme.colors.text, fontWeight: '600' }
});
