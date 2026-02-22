import '../lib/i18n';

import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFoyer } from '@/features/foyer/hooks/useFoyer';
import { createFoyer } from '@/features/foyer/services/foyerService';

export default function RootLayout() {
  const { session, loading: authLoading } = useAuth();
  const { hasFoyer, loading: foyerLoading } = useFoyer(session?.user.id);
  const creatingFoyer = useRef(false);

  const loading = authLoading || (!!session && foyerLoading);

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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F3F0' }}>
        <ActivityIndicator size="large" color="#FF8400" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="add" />
      </Stack>
    </>
  );
}
