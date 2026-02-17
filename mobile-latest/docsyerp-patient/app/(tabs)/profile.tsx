import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import auth from '@/services/auth';
import Header from '@/components/Header';
import Drawer from '@/components/Drawer';
import Footer from '@/components/Footer';

export default function Profile(){
  const [user, setUser] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(()=>{
    let mounted = true;
    auth.getUser().then(u => { if(mounted) setUser(u); }).catch(()=>{});
    return () => { mounted = false; };
  },[]);

  if(!user) return (
    <View style={styles.container}><Text>Loading...</Text></View>
  );

  return (
    <View style={{flex:1}}>
      <Header title="Profile" onMenu={() => setDrawerVisible(true)} />
      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={styles.container}>
        <Text style={styles.title}>{user.name || 'Patient'}</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user.email}</Text>
        <Text style={styles.label}>Phone</Text>
        <Text style={styles.value}>{user.phone}</Text>
        <TouchableOpacity style={styles.logout} onPress={() => auth.logout()}>
          <Text style={{color:'#fff'}}>Logout</Text>
        </TouchableOpacity>
      </View>
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, padding:16, backgroundColor: '#f7f9fb' },
  title: { fontSize:20, marginBottom:8 },
  label: { marginTop:12, color:'#666', fontWeight:'600' },
  value: { marginTop:4, color:'#111' },
  logout: { marginTop:20, backgroundColor:'#e53935', padding:12, borderRadius:8, alignItems:'center' }
});
