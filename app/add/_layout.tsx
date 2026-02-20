import { Stack } from 'expo-router';

export default function AddLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="scan-barcode" />
      <Stack.Screen name="product-confirm" />
    </Stack>
  );
}
