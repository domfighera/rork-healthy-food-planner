import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Colors from '../constants/colors';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export default function Logo({ size = 'medium', showText = true }: LogoProps) {
  const imageSize = size === 'small' ? 32 : size === 'medium' ? 48 : 120;
  const textSize = size === 'small' ? 18 : size === 'medium' ? 24 : 36;

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://rork.app/pa/ksxv0fwf7xrpbfhwfb7qw/logo' }}
        style={[styles.logo, { width: imageSize, height: imageSize }]}
        resizeMode="contain"
      />
      {showText && (
        <Text style={[styles.text, { fontSize: textSize }]}>NutriScan</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    borderRadius: 8,
  },
  text: {
    fontWeight: '700' as const,
    color: Colors.primary.blue,
  },
});
