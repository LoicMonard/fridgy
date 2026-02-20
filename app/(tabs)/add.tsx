import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

export default function AddScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('add.title')}</Text>
      </View>
      <View style={styles.options}>
        <TouchableOpacity style={styles.option}>
          <View style={[styles.iconBox, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="barcode-outline" size={26} color="#FF8400" />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{t('add.scan')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.option}>
          <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="receipt-outline" size={26} color="#1565C0" />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{t('add.scanReceipt')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.option}>
          <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="pencil-outline" size={26} color="#2E7D32" />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{t('add.manual')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F3F0' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#111111' },
  options: { paddingHorizontal: 20, gap: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#111111' },
});
