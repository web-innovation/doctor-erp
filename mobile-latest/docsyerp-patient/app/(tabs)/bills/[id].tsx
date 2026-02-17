import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api from '@/services/api';
import Header from '@/components/Header';
import Drawer from '@/components/Drawer';
import Footer from '@/components/Footer';

export default function BillDetail(){
  const { id } = useLocalSearchParams();
  const [bill, setBill] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    if(!id) return;
    api.getBill(id).then(d => { if(mounted) setBill(d); }).catch(()=>{});
    return () => { mounted = false; };
  }, [id]);

  if(!bill) return <View style={styles.container}><Text style={{padding:16}}>Loading bill...</Text></View>;

  return (
    <View style={{flex:1}}>
      <Header title={`Bill #${bill.id || ''}`} onMenu={() => setDrawerVisible(true)} />
      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <ScrollView style={styles.container} contentContainerStyle={{padding:16}}>
        <Text style={styles.label}>Date</Text>
        <Text style={styles.value}>{bill.date || bill.createdAt || '-'}</Text>

        <Text style={styles.label}>Patient</Text>
        <Text style={styles.value}>{bill.patient?.name || '-'}</Text>

        <Text style={styles.label}>Items</Text>
        {Array.isArray(bill.items) && bill.items.length ? bill.items.map(it => (
          <View key={it.id} style={{marginBottom:8}}>
            <Text style={styles.value}>{it.description} — {it.amount}</Text>
          </View>
        )) : <Text style={styles.value}>-</Text>}

        <Text style={styles.label}>Total</Text>
        <Text style={[styles.value, {fontWeight:'700'}]}>₹ {typeof bill.totalAmount === 'number' ? bill.totalAmount.toFixed(2) : (bill.total || bill.amount || '-')}</Text>
        <Text style={styles.label}>Paid</Text>
        <Text style={styles.value}>₹ {typeof bill.paidAmount === 'number' ? bill.paidAmount.toFixed(2) : (bill.paid || 0)}</Text>
        <Text style={styles.label}>Due</Text>
        <Text style={styles.value}>₹ {typeof bill.dueAmount === 'number' ? bill.dueAmount.toFixed(2) : (bill.due || 0)}</Text>
      </ScrollView>
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#fff' },
  label: { marginTop:12, fontWeight:'700' },
  value: { marginTop:6 }
});
