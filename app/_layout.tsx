import '../lib/i18n';

import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Gabarito_400Regular,
  Gabarito_500Medium,
  Gabarito_600SemiBold,
  Gabarito_700Bold,
} from '@expo-google-fonts/gabarito';
import { Graduate_400Regular } from '@expo-google-fonts/graduate';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFoyer } from '@/features/foyer/hooks/useFoyer';
import { createFoyer } from '@/features/foyer/services/foyerService';
import { colors } from '@/lib/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Gabarito_400Regular,
    Gabarito_500Medium,
    Gabarito_600SemiBold,
    Gabarito_700Bold,
    Graduate_400Regular,
  });

  const { session, loading: authLoading } = useAuth();
  const { hasFoyer, loading: foyerLoading } = useFoyer(session?.user.id);
  const creatingFoyer = useRef(false);

  const loading = !fontsLoaded || authLoading || (!!session && foyerLoading);

  useEffect(() => {
    if (loading) return;

    if (!session) {
      router.replace('/(auth)/login');
      return;
    }

    if (hasFoyer) {
      router.replace('/(tabs)');
      return;
    }

    if (creatingFoyer.current) return;
    creatingFoyer.current = true;

    createFoyer('Mon foyer', session.user.id)
      .then(() => router.replace('/(tabs)'))
      .catch((err) => {
        console.error('[RootLayout] auto-createFoyer failed', err);
        creatingFoyer.current = false;
      });
  }, [loading, session, hasFoyer]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.light.background }}>
        <ActivityIndicator size="large" color={colors.light.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="add" />
        <Stack.Screen name="recipes" />
      </Stack>
    </GestureHandlerRootView>
  );
}
