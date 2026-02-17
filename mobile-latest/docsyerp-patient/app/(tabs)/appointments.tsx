import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import Header from '@/components/Header';
import Drawer from '@/components/Drawer';
import Footer from '@/components/Footer';
import api from '@/services/api';
import { useRouter } from 'expo-router';

function AppointmentCard({item, onPress}){
  const dt = item.date ? new Date(item.date) : null;
  const dateStr = dt ? dt.toLocaleDateString() : '';
  function formatTimeSlot(ts){
    if(!ts) return ''; // no time
    const first = ts.split('-')[0].trim();
    const parts = first.split(':');
    if(parts.length < 2) return first;
    const hh = parseInt(parts[0],10);
    const mm = parts[1];
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const hh12 = (hh % 12) === 0 ? 12 : hh % 12;
    return `${hh12}:${mm} ${ampm}`;
  }
  const timeStr = item.timeSlot ? formatTimeSlot(item.timeSlot) : (dt ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <View style={{flexDirection:'row', justifyContent:'space-between'}}>
        <Text style={styles.cardDate}>{dateStr} {timeStr ? `· ${timeStr}` : ''}</Text>
        <Text style={[styles.cardStatus, statusColor(item.status)]}>{item.status || ''}</Text>
      </View>
      <Text style={styles.cardTitle}>{item.doctorName || (item.doctor && item.doctor.name) || item.appointmentNo || item.type || 'Appointment'}</Text>
      <Text style={styles.cardNotes}>{item.patient?.name || ''}</Text>
    </TouchableOpacity>
  );
}

function statusColor(status){
  switch((status||'').toString().toUpperCase()){
    case 'COMPLETED': return { color: '#129575' };
    case 'CONFIRMED': return { color: '#129575' };
    case 'REVIEW': return { color: '#f4a261' };
    case 'CANCELLED': return { color: '#9aa0a6' };
    case 'REJECTED': return { color: '#e76f51' };
    case 'SCHEDULED': return { color: '#2b6cb0' };
    default: return { color: '#333' };
  }
}

function CancelButton({ appointment, onCancelled }){
  const handleCancel = () => {
    Alert.alert('Cancel appointment', 'Are you sure you want to cancel this appointment?', [
      { text: 'No' },
      { text: 'Yes', onPress: async () => {
        try{
          await api.updateAppointmentStatus(appointment.id, 'CANCELLED');
          onCancelled && onCancelled(appointment.id);
        }catch(e){
          Alert.alert('Error', 'Failed to cancel appointment');
        }
      }}
    ]);
  };

  if (!appointment || appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') return null;
  return (
    <TouchableOpacity onPress={handleCancel} style={{marginTop:8}}>
      <Text style={{color:'#e07a5f'}}>Cancel</Text>
    </TouchableOpacity>
  );
}

export default function Appointments() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const router = useRouter();
  // loadPage is exposed so the header refresh button can call it
  useEffect(() => { loadPage(1); }, []);

  let isMounted = true;
  async function loadPage(pageNum = 1) {
    try {
      if (!isMounted) return;
      if (pageNum === 1) setLoading(true); else setLoadingMore(true);
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
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // cleanup
  React.useEffect(() => { return () => { isMounted = false; }; }, []);

  return (
    <View style={{flex:1}}>
      <Header title="Appointments" onMenu={() => setDrawerVisible(true)} rightIcon="arrow.clockwise" onRight={() => loadPage(1)} />
      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={styles.container}>
        <FlatList
          data={appointments}
          keyExtractor={(i) => String(i.id)}
          renderItem={({item}) => (
            <View>
              <AppointmentCard item={item} onPress={() => router.push(`/(tabs)/appointments/${item.id}`)} />
              <CancelButton appointment={item} onCancelled={(id) => {
                // refresh list after cancel
                loadPage(1);
              }} />
            </View>
          )}
          onEndReached={() => {
            if (!loadingMore && page < totalPages) {
              const next = page + 1;
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              (async () => {
                try {
                  setLoadingMore(true);
                  const res = await api.getAppointments('me', next, 10);
                  let items = [];
                  let pagination = null;
                  if (res && typeof res === 'object' && Array.isArray(res.data)) {
                    items = res.data;
                    pagination = res.pagination || null;
                  } else if (Array.isArray(res)) {
                    items = res;
                  }
                  setAppointments((prev) => [...prev, ...(items || [])]);
                  if (pagination) {
                    setPage(pagination.page || next);
                    setTotalPages(pagination.totalPages || 1);
                  } else {
                    setPage(next);
                  }
                } catch (e) {
                  // ignore
                } finally {
                  setLoadingMore(false);
                }
              })();
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={() => (
            loadingMore ? <Text style={{textAlign:'center', padding:12}}>Loading more...</Text> : null
          )}
          ListEmptyComponent={<Text style={{textAlign:'center', marginTop:20}}>No appointments found.</Text>}
        />
      </View>
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, padding:16, backgroundColor:'#f7f9fb' },
  card: { backgroundColor: '#fff', padding:14, borderRadius:10, marginVertical:8, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:6 },
  cardDate: { color:'#666', fontSize:13 },
  cardTitle: { fontSize:16, fontWeight:'700', marginTop:6 },
  cardNotes: { marginTop:6, color:'#333' }
});
