import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

export const Loader: React.FC = () => {
  const rotateValue = new Animated.Value(0);

  Animated.loop(
    Animated.timing(rotateValue, {
      toValue: 1,
      duration: 1200,
      easing: Easing.linear,
      useNativeDriver: true,
    }),
  ).start();

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.loader} accessibilityLabel="loader">
      <Animated.View style={[styles.loaderContent, { transform: [{ rotate }] }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContent: {
    borderRadius: 50,
    width: 40,
    height: 40,
    borderWidth: 3,
    borderColor: '#ddd',
    borderLeftColor: '#000',
  },
});
