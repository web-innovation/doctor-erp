import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import api from '@/services/api';
import Header from '@/components/Header';
import Drawer from '@/components/Drawer';
import Footer from '@/components/Footer';
import { PatientTheme } from '@/constants/patientTheme';

function PrescriptionCard({ item, onPress }) {
  const dt = item.date ? new Date(item.date) : null;
  const dateStr = dt ? dt.toLocaleDateString() : '';
  const timeStr = dt ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardDate}>{dateStr} {timeStr ? `| ${timeStr}` : ''}</Text>
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const router = useRouter();

  const loadPage = async (pageNum = 1) => {
    try {
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
    } catch {}
  };

  useEffect(() => { loadPage(1); }, []);

  return (
    <View style={{ flex: 1 }}>
      <Header title="Prescriptions" onMenu={() => setDrawerVisible(true)} rightIcon="arrow.clockwise" onRight={() => loadPage(1)} />
      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={styles.container}>
        <FlatList
          data={prescriptions}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <PrescriptionCard item={item} onPress={() => router.push(`/(tabs)/prescriptions/${item.id}`)} />
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
          ListEmptyComponent={<Text style={styles.empty}>No prescriptions found.</Text>}
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
  cardDate: { fontSize: 13, color: PatientTheme.colors.textMuted },
  cardId: { fontSize: 13, color: PatientTheme.colors.primary, fontWeight: '600' },
  cardNotes: { marginTop: 8, color: PatientTheme.colors.text },
  loadingMore: { textAlign: 'center', padding: 12, color: PatientTheme.colors.textMuted },
  empty: { textAlign: 'center', marginTop: 20, color: PatientTheme.colors.textMuted },
});
