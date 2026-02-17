import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import api from '@/services/api';
import Header from '@/components/Header';
import Drawer from '@/components/Drawer';
import Footer from '@/components/Footer';

function PrescriptionCard({item, onPress}){
  const dt = item.date ? new Date(item.date) : null;
  const dateStr = dt ? dt.toLocaleDateString() : '';
  const timeStr = dt ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <View style={{flexDirection:'row', justifyContent:'space-between'}}>
        <Text style={styles.cardDate}>{dateStr} {timeStr ? `· ${timeStr}` : ''}</Text>
        <Text style={styles.cardId}>{item.prescriptionNo || ''}</Text>
      </View>
      <Text style={styles.cardNotes} numberOfLines={2}>{item.clinicalNotes || item.advice || '-'}</Text>
    </TouchableOpacity>
  );
}

export default function PrescriptionsScreen() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [drawerVisible, setDrawerVisible] = useState(false);

  const loadPage = async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true); else setLoadingMore(true);
      const res = await api.getPrescriptions('me', pageNum, 10);
      let items = [];
      let pagination = null;
      if (res && typeof res === 'object' && Array.isArray(res.data)) {
        items = res.data;
        pagination = res.pagination || null;
      } else if (Array.isArray(res)) {
        items = res;
      }

      if (pageNum === 1) setPrescriptions(items || []);
      else setPrescriptions((prev) => [...prev, ...(items || [])]);

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
  };

  useEffect(() => { loadPage(1); }, []);
  const router = useRouter();

  return (
    <View style={{flex:1}}>
      <Header title="Prescriptions" onMenu={() => setDrawerVisible(true)} rightIcon="arrow.clockwise" onRight={() => loadPage(1)} />
      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={styles.container}>
        <FlatList
          data={prescriptions}
          keyExtractor={(item) => String(item.id)}
          renderItem={({item}) => (
            <PrescriptionCard item={item} onPress={() => router.push(`/(tabs)/prescriptions/${item.id}`)} />
          )}
          onEndReached={() => {
            if (!loadingMore && page < totalPages) loadPage(page + 1);
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={() => (
            loadingMore ? <Text style={{textAlign:'center', padding:12}}>Loading more...</Text> : null
          )}
          ListEmptyComponent={<Text style={{textAlign:'center', marginTop:20}}>No prescriptions found.</Text>}
        />
      </View>
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, marginBottom: 12 },
  item: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemTitle: { fontWeight: '600' }
  ,
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 10, marginVertical: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 },
  cardDate: { fontSize: 13, color: '#666' },
  cardId: { fontSize: 13, color: '#666' },
  cardNotes: { marginTop: 8, color: '#333' }
});
