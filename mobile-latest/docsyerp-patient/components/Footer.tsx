import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from './ui/icon-symbol';
import { PatientTheme } from '@/constants/patientTheme';

export default function Footer(){
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={["bottom"]} style={[styles.safe, { paddingBottom: insets.bottom || 12 }]}>
      <View style={styles.footer}>
        <IconSymbol name="house.fill" size={14} color="#777" />
        <Text style={styles.text}> 2026 G&A AI. All rights reserved.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: PatientTheme.colors.surface },
  footer: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: PatientTheme.colors.border,
  },
  text: { color: PatientTheme.colors.textMuted, fontSize: 12, marginLeft: 6 }
});
