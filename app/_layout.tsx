import '../lib/i18n';

import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useFoyer } from '@/features/foyer/hooks/useFoyer';

export default function RootLayout() {
  const { session, loading: authLoading } = useAuth();
  const { hasFoyer, loading: foyerLoading } = useFoyer(session?.user.id);

  const loading = authLoading || (!!session && foyerLoading);

  useEffect(() => {
    if (loading) return;

    if (!session) {
      router.replace('/(auth)/login');
    } else if (!hasFoyer) {
      router.replace('/onboarding/foyer');
    } else {
      router.replace('/(tabs)');
    }
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
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="add" />
      </Stack>
    </>
  );
}
