import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const SnackbarContext = createContext(null);

export function useSnackbar() {
  return useContext(SnackbarContext);
}

export function SnackbarProvider({ children }){
  const [message, setMessage] = useState(null);
  const timerRef = useRef(null);
  const opacity = useRef(new Animated.Value(0)).current;

  const show = useCallback((msg, duration = 2000) => {
    // clear existing
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMessage(msg);
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    timerRef.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setMessage(null));
      timerRef.current = null;
    }, duration);
  }, [opacity]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <SnackbarContext.Provider value={{ show }}>
      {children}
      {message ? (
        <Animated.View style={[styles.container, { opacity }] } pointerEvents="none">
          <View style={styles.toast}>
            <Text style={styles.text}>{message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </SnackbarContext.Provider>
  );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center' },
  toast: { backgroundColor: '#111', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, maxWidth: width - 40 },
  text: { color: '#fff' }
});

export default SnackbarProvider;
