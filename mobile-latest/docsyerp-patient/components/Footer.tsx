import React from 'react';
import { SafeAreaView as RNSafeAreaView, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from './ui/icon-symbol';

export default function Footer(){
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={["bottom"]} style={[styles.safe, { paddingBottom: insets.bottom || 12 }]}>
      <View style={styles.footer}>
        <IconSymbol name="copyright" size={14} color="#777" />
        <Text style={styles.text}> 2026 G&A AI. All rights reserved.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: '#fafafa' },
  footer: { paddingVertical:10, alignItems:'center', justifyContent:'center', flexDirection:'row', borderTopWidth:1, borderTopColor:'#eee' },
  text: { color:'#777', fontSize:12, marginLeft:6 }
});
