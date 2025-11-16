import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Colors from '../constants/colors';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

const LOGO_URI = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/54plexrm0pv9jh8dxknfb';

export default function Logo({ size = 'medium', showText = true }: LogoProps) {
  const imageSize = size === 'small' ? 36 : size === 'medium' ? 52 : 140;
  const textSize = size === 'small' ? 18 : size === 'medium' ? 24 : 36;

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: LOGO_URI }}
        style={[styles.logo, { width: imageSize, height: imageSize }]}
        resizeMode="contain"
      />
      {showText && (
        <Text style={[styles.text, { fontSize: textSize }]}>DietWise AI</Text>
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
    borderRadius: 18,
  },
  text: {
    fontWeight: '700' as const,
    color: Colors.primary.blue,
  },
});
