import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useReceiptScan } from '@/features/scanning/hooks/useReceiptScan';

export default function ScanReceiptScreen() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);
  const { step, items, error, processPhoto, reset } = useReceiptScan();

  const processing = step === 'processing';

  // Navigate once processing is done
  useEffect(() => {
    if (step === 'done') {
      if (items.length === 0) {
        Alert.alert(t('receiptScan.errorTitle'), t('receiptScan.errorEmpty'), [
          { text: t('common.retry'), onPress: reset },
        ]);
        return;
      }
      router.replace({
        pathname: '/add/receipt-confirm',
        params: { items: JSON.stringify(items) },
      });
      reset();
    } else if (step === 'error') {
      Alert.alert(t('receiptScan.errorTitle'), t('receiptScan.errorLlm'), [
        { text: t('common.retry'), onPress: reset },
      ]);
    }
  }, [step]);

  async function handleCapture() {
    if (capturing || processing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.6, base64: true });
      if (photo?.base64) {
        await processPhoto(photo.base64, 'image/jpeg');
      }
    } finally {
      setCapturing(false);
    }
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color="#FF8400" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="camera-outline" size={48} color="#9CA3AF" />
        <Text style={styles.permissionText}>{t('scan.cameraPermission')}</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>{t('scan.grantPermission')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Header */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('receiptScan.title')}</Text>
      </SafeAreaView>

      {/* Hint */}
      <View style={styles.hintContainer}>
        <Text style={styles.hint}>{t('receiptScan.hint')}</Text>
      </View>

      {/* Capture button */}
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity
          style={[styles.captureBtn, (capturing || processing) && styles.captureBtnDisabled]}
          onPress={handleCapture}
          disabled={capturing || processing}
        >
          <Ionicons name="camera" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Processing overlay */}
      {processing && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#FF8400" />
          <Text style={styles.overlayText}>{t('receiptScan.analyzing')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#F2F3F0',
  },
  permissionText: { fontSize: 15, color: '#6B7280', textAlign: 'center', paddingHorizontal: 40 },
  permissionBtn: {
    backgroundColor: '#FF8400',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  hintContainer: {
    position: 'absolute',
    top: '35%',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  hint: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 32,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF8400',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  captureBtnDisabled: { opacity: 0.5 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  overlayText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
});
