import { Stack } from 'expo-router';

export default function AddLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="scan-barcode" />
      <Stack.Screen name="product-confirm" />
      <Stack.Screen name="scan-receipt" />
      <Stack.Screen name="receipt-confirm" />
      <Stack.Screen name="manual-product" />
    </Stack>
  );
}
