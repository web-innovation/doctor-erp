import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import Header from '@/components/Header';
import Drawer from '@/components/Drawer';
import Footer from '@/components/Footer';
import api from '@/services/api';
import { useRouter } from 'expo-router';
import { PatientTheme } from '@/constants/patientTheme';

function statusColor(status) {
  switch ((status || '').toString().toUpperCase()) {
    case 'COMPLETED':
    case 'CONFIRMED':
      return { color: PatientTheme.colors.success };
    case 'REVIEW':
      return { color: PatientTheme.colors.warning };
    case 'CANCELLED':
      return { color: PatientTheme.colors.textMuted };
    case 'REJECTED':
      return { color: PatientTheme.colors.danger };
    default:
      return { color: PatientTheme.colors.primary };
  }
}

function AppointmentCard({ item, onPress }) {
  const dt = item.date ? new Date(item.date) : null;
  const dateStr = dt ? dt.toLocaleDateString() : '';
  const timeStr = item.timeSlot || (dt ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardDate}>{dateStr} {timeStr ? `| ${timeStr}` : ''}</Text>
        <Text style={[styles.cardStatus, statusColor(item.status)]}>{item.status || ''}</Text>
      </View>
      <Text style={styles.cardTitle}>{item.doctorName || item?.doctor?.name || item.type || 'Appointment'}</Text>
      <Text style={styles.cardNotes}>{item.clinic?.name || item.patient?.name || ''}</Text>
    </TouchableOpacity>
  );
}

function CancelButton({ appointment, onCancelled }) {
  const handleCancel = () => {
    Alert.alert('Cancel appointment', 'Are you sure you want to cancel this appointment?', [
      { text: 'No' },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            await api.updateAppointmentStatus(appointment.id, 'CANCELLED');
            onCancelled && onCancelled(appointment.id);
          } catch {
            Alert.alert('Error', 'Failed to cancel appointment');
          }
        },
      },
    ]);
  };

  if (!appointment || appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') return null;
  return (
    <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
      <Text style={styles.cancelBtnText}>Cancel</Text>
    </TouchableOpacity>
  );
}

export default function Appointments() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const router = useRouter();

  useEffect(() => { loadPage(1); }, []);

  const loadPage = async (pageNum = 1) => {
    try {
      const res = await api.getAppointments('me', pageNum, 10);
      let items = [];
      let pagination = null;
      if (res && typeof res === 'object' && Array.isArray(res.data)) {
        items = res.data;
        pagination = res.pagination || null;
      } else if (Array.isArray(res)) {
        items = res;
      }

      if (pageNum === 1) setAppointments(items || []);
      else setAppointments((prev) => [...prev, ...(items || [])]);

      if (pagination) {
        setPage(pagination.page || pageNum);
        setTotalPages(pagination.totalPages || 1);
      } else {
        setPage(pageNum);
        setTotalPages(items && items.length < 10 ? pageNum : Math.max(pageNum, 1));
      }
    } catch {}
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Appointments" onMenu={() => setDrawerVisible(true)} rightIcon="arrow.clockwise" onRight={() => loadPage(1)} />
      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />

      <View style={styles.container}>
        <FlatList
          data={appointments}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <View>
              <AppointmentCard item={item} onPress={() => router.push(`/(tabs)/appointments/${item.id}`)} />
              <CancelButton appointment={item} onCancelled={() => loadPage(1)} />
            </View>
          )}
          onEndReached={() => {
            if (!loadingMore && page < totalPages) {
              const next = page + 1;
              setLoadingMore(true);
              (async () => {
                await loadPage(next);
                setLoadingMore(false);
              })();
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <Text style={styles.loadingMore}>Loading more...</Text> : null}
          ListEmptyComponent={<Text style={styles.empty}>No appointments found.</Text>}
        />
      </View>

      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: PatientTheme.colors.bg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  card: {
    backgroundColor: PatientTheme.colors.surface,
    padding: 14,
    borderRadius: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: PatientTheme.colors.border,
  },
  cardDate: { color: PatientTheme.colors.textMuted, fontSize: 13 },
  cardStatus: { fontWeight: '700', fontSize: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginTop: 6, color: PatientTheme.colors.text },
  cardNotes: { marginTop: 6, color: PatientTheme.colors.textMuted },
  cancelBtn: { marginTop: 6, alignSelf: 'flex-end', paddingHorizontal: 8, paddingVertical: 6 },
  cancelBtnText: { color: PatientTheme.colors.danger, fontWeight: '600' },
  loadingMore: { textAlign: 'center', padding: 12, color: PatientTheme.colors.textMuted },
  empty: { textAlign: 'center', marginTop: 20, color: PatientTheme.colors.textMuted },
});
