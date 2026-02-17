import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from './ui/icon-symbol';
import auth from '@/services/auth';
import { useSnackbar } from './Snackbar';

export default function Drawer({ visible, onClose }) {
  const router = useRouter();
  const snackbar = useSnackbar();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.drawer}>
          <Text style={styles.title}>Menu</Text>
          <TouchableOpacity style={styles.item} onPress={() => { onClose(); router.push('/'); }}>
            <IconSymbol name="house.fill" size={20} color="#333" />
            <Text style={styles.label}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={() => { onClose(); router.push('/(tabs)/bills'); }}>
            <IconSymbol name="creditcard.fill" size={20} color="#333" />
            <Text style={styles.label}>Bills</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={() => { onClose(); router.push('/(tabs)/prescriptions'); }}>
            <IconSymbol name="pills.fill" size={20} color="#333" />
            <Text style={styles.label}>Prescriptions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={() => { onClose(); router.push('/(tabs)/appointments'); }}>
            <IconSymbol name="calendar.fill" size={20} color="#333" />
            <Text style={styles.label}>Appointments</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={() => {
            Alert.alert('Logout', 'Are you sure you want to logout?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Logout', style: 'destructive', onPress: async () => {
                try{
                  await auth.logout();
                }catch(e){}
                onClose();
                // Show in-app snackbar and navigate to login
                try{ snackbar && snackbar.show('You have been logged out'); }catch(e){}
                router.replace('/login');
              }}
            ]);
          }}>
            <IconSymbol name="arrow.right.square" size={20} color="#333" />
            <Text style={styles.label}>Logout</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'flex-start' },
  drawer: { width: 260, backgroundColor:'#fff', padding:16, paddingTop:48, height:'100%' },
  title: { fontSize:18, fontWeight:'700', marginBottom:12 },
  item: { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:12 },
  label: { marginLeft:10 }
});
