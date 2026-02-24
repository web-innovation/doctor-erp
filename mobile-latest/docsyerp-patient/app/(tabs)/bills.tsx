import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import api from '@/services/api';
import Header from '@/components/Header';
import Drawer from '@/components/Drawer';
import Footer from '@/components/Footer';
import { useRouter } from 'expo-router';
import { PatientTheme } from '@/constants/patientTheme';
import ProfileQuickSwitch from '@/components/ProfileQuickSwitch';

function BillCard({ item, onPress }) {
  const amountText = typeof item.totalAmount === 'number'
    ? item.totalAmount.toFixed(2)
    : String(item.total || item.amount || 'N/A');

  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardDate}>{item.date ? new Date(item.date).toLocaleString() : ''}</Text>
        <Text style={styles.cardAmount}>INR {amountText}</Text>
      </View>
      <View style={[styles.rowBetween, { marginTop: 6 }]}>
        <Text style={styles.cardTitle}>{item.billNo || `#${item.id}`}</Text>
        <Text style={[styles.cardStatus, item.paymentStatus === 'PAID' ? styles.paid : styles.pending]}>
          {item.paymentStatus || item.status || 'N/A'}
        </Text>
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

  const loadPage = async (pageNum = 1) => {
    try {
      const res = await api.getBills('me', pageNum, 10);
      let items = [];
      let pagination = null;
      if (res && typeof res === 'object' && Array.isArray(res.data)) {
        items = res.data;
        pagination = res.pagination || null;
      } else if (Array.isArray(res)) {
        items = res;
      }

      if (pageNum === 1) setBills(items || []);
      else setBills((prev) => [...prev, ...(items || [])]);

      if (pagination) {
        setPage(pagination.page || pageNum);
        setTotalPages(pagination.totalPages || 1);
      } else {
        setPage(pageNum);
        setTotalPages(items && items.length < 10 ? pageNum : Math.max(pageNum, 1));
      }
    } catch {}
  };

  useEffect(() => { loadPage(1); }, []);

  return (
    <View style={{ flex: 1 }}>
      <Header title="My Bills" onMenu={() => setDrawerVisible(true)} rightIcon="arrow.clockwise" onRight={() => loadPage(1)} />
      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={styles.container}>
        <ProfileQuickSwitch onChanged={() => loadPage(1)} />
        <FlatList
          data={bills}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <BillCard item={item} onPress={() => router.push(`/(tabs)/bills/${item.id}`)} />
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
          ListEmptyComponent={<Text style={styles.empty}>No bills found.</Text>}
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
  cardTitle: { fontWeight: '700', color: PatientTheme.colors.text },
  cardAmount: { color: PatientTheme.colors.text, fontWeight: '700' },
  cardDate: { color: PatientTheme.colors.textMuted, fontSize: 12 },
  cardStatus: { marginTop: 6, fontWeight: '700', fontSize: 12 },
  paid: { color: PatientTheme.colors.success },
  pending: { color: PatientTheme.colors.warning },
  loadingMore: { textAlign: 'center', padding: 12, color: PatientTheme.colors.textMuted },
  empty: { textAlign: 'center', marginTop: 20, color: PatientTheme.colors.textMuted },
});
