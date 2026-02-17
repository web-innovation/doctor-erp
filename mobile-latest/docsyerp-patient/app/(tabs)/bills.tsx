import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import api from '@/services/api';
import Header from '@/components/Header';
import Drawer from '@/components/Drawer';
import Footer from '@/components/Footer';
import { useRouter } from 'expo-router';

function BillCard({item, onPress}){
  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <View style={{flexDirection:'row', justifyContent:'space-between'}}>
        <Text style={styles.cardDate}>{item.date ? new Date(item.date).toLocaleString() : ''}</Text>
        <Text style={styles.cardAmount}>₹ {typeof item.totalAmount === 'number' ? item.totalAmount.toFixed(2) : (item.total || item.amount ? String(item.total || item.amount) : 'N/A')}</Text>
      </View>
      <View style={{flexDirection:'row', justifyContent:'space-between', marginTop:6}}>
        <Text style={styles.cardTitle}>{item.billNo || `#${item.id}`}</Text>
        <Text style={[styles.cardStatus, item.paymentStatus === 'PAID' ? {color: '#129575'} : {color: '#e07a5f'}]}>{item.paymentStatus || item.status || 'N/A'}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function BillsScreen() {
  const [bills, setBills] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const router = useRouter();
  // Expose loadPage so header refresh can call it
  let mounted = true;
  async function loadPage(pageNum = 1) {
    console.log('[Bills] loadPage start', pageNum);
    try {
      const res = await api.getBills('me', pageNum, 10);
      console.log('[Bills] api.getBills returned', !!res);
      let items = [];
      let pagination = null;
      if (res && typeof res === 'object' && Array.isArray(res.data)) {
        items = res.data;
        pagination = res.pagination || null;
      } else if (Array.isArray(res)) {
        items = res;
      }

      if (!mounted) return;
      if (pageNum === 1) setBills(items || []);
      else setBills((prev) => [...prev, ...(items || [])]);

      if (pagination) {
        setPage(pagination.page || pageNum);
        setTotalPages(pagination.totalPages || 1);
      } else {
        setPage(pageNum);
        setTotalPages(items && items.length < 10 ? pageNum : Math.max(pageNum, 1));
      }
    } catch (e) {
      console.log('[Bills] loadPage error', e?.message || e);
    }
  }

  useEffect(() => { loadPage(1); return () => { mounted = false; }; }, []);

  return (
    <View style={{flex:1}}>
      <Header title="My Bills" onMenu={() => setDrawerVisible(true)} rightIcon="arrow.clockwise" onRight={() => loadPage(1)} />
      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={styles.container}>
        <FlatList
          data={bills}
          keyExtractor={(item) => String(item.id)}
          renderItem={({item}) => (
            <BillCard item={item} onPress={() => router.push(`/(tabs)/bills/${item.id}`)} />
          )}
          onEndReached={() => {
            if (!loadingMore && page < totalPages) {
              const next = page + 1;
              setLoadingMore(true);
              (async () => {
                try {
                  const res = await api.getBills('me', next, 10);
                  let items = [];
                  let pagination = null;
                  if (res && typeof res === 'object' && Array.isArray(res.data)) {
                    items = res.data;
                    pagination = res.pagination || null;
                  } else if (Array.isArray(res)) {
                    items = res;
                  }
                  setBills((prev) => [...prev, ...(items || [])]);
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
          ListEmptyComponent={<Text style={{textAlign:'center', marginTop:20}}>No bills found.</Text>}
        />
      </View>
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f7f9fb' },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 10, marginVertical: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 },
  cardTitle: { fontWeight: '700' },
  cardAmount: { color: '#111', fontWeight: '700' },
  cardStatus: { marginTop: 6, color: '#666' }
});
