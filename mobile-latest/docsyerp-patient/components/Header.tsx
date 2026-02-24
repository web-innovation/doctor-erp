import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { IconSymbol } from './ui/icon-symbol';
import { PatientTheme } from '@/constants/patientTheme';

export default function Header({ title = 'Docsy Patient', onMenu, rightIcon, onRight }: any) {
  const paddingTop = Platform.OS === 'android' ? StatusBar.currentHeight || 8 : 0;
  return (
    <SafeAreaView style={[styles.safe, { paddingTop }]}> 
      <View style={styles.header}>
        <TouchableOpacity onPress={onMenu} style={styles.menuBtn}>
          <IconSymbol name="list.bullet" size={22} color={PatientTheme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        {rightIcon ? (
          <TouchableOpacity onPress={onRight} style={styles.menuBtn}>
            <IconSymbol name={rightIcon} size={20} color={PatientTheme.colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{width:36}} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: PatientTheme.colors.surface },
  header: {
    height: 58,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: PatientTheme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PatientTheme.colors.surface,
  },
  menuBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: PatientTheme.colors.surfaceSoft,
  },
  title: { fontSize: 18, fontWeight: '700', color: PatientTheme.colors.text }
});
