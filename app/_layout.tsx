import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Animated, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider, useApp } from "../contexts/AppContext";
import { MealPlanProvider } from "../contexts/MealPlanContext";
import Logo from "../components/Logo";
import Colors from "../constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="product" 
        options={{ 
          title: "Product Details",
          presentation: "card"
        }} 
      />
    </Stack>
  );
}

function AppNavigator() {
  const { profile, isLoading } = useApp();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inOnboarding = segments[0] === 'onboarding';

    if (!profile.onboardingCompleted && !inOnboarding) {
      router.replace('/onboarding');
    } else if (profile.onboardingCompleted && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [profile.onboardingCompleted, isLoading, segments, router]);

  return <RootLayoutNav />;
}

function SplashView({ onComplete }: { onComplete: () => void }) {
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete();
    });
  }, [fadeAnim, onComplete]);

  return (
    <Animated.View style={[styles.splashContainer, { opacity: fadeAnim }]}>
      <StatusBar barStyle="dark-content" />
      <Logo size="large" showText={true} />
      <Text style={styles.splashTagline}>Smart Nutrition & Budget Tracking</Text>
    </Animated.View>
  );
}

export default function RootLayout() {
  const [showAppSplash, setShowAppSplash] = useState<boolean>(true);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  if (showAppSplash) {
    return (
      <View style={styles.container}>
        <SplashView onComplete={() => setShowAppSplash(false)} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <MealPlanProvider>
          <GestureHandlerRootView style={styles.container}>
            <AppNavigator />
          </GestureHandlerRootView>
        </MealPlanProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  splashTagline: {
    fontSize: 18,
    color: Colors.text.secondary,
    fontWeight: '500' as const,
  },
});
