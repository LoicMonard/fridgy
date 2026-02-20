import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { addToStock } from '@/features/stock/services/stockService';
import type { Lieu, ScannedProduct, StockItemDraft, Unite } from '@/features/scanning/types';

const LIEUX: { value: Lieu; label: string; icon: string }[] = [
  { value: 'frigo', label: 'productConfirm.frigo', icon: 'snow-outline' },
  { value: 'placard', label: 'productConfirm.placard', icon: 'cube-outline' },
  { value: 'congelateur', label: 'productConfirm.congelateur', icon: 'thermometer-outline' },
];

const UNITES: Unite[] = ['pièce', 'g', 'kg', 'ml', 'L', 'boîte', 'sachet'];

export default function ProductConfirmScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ product: string; notFound?: string }>();
  const notFound = params.notFound === '1';

  const initial: ScannedProduct = JSON.parse(params.product);

  const [nom, setNom] = useState(initial.nom);
  const [quantite, setQuantite] = useState('1');
  const [unite, setUnite] = useState<Unite>('pièce');
  const [lieu, setLieu] = useState<Lieu>('frigo');
  const [datePeremption, setDatePeremption] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!nom.trim()) {
      Alert.alert(t('productConfirm.errorNomRequired'));
      return;
    }

    const qty = parseFloat(quantite.replace(',', '.'));
    if (isNaN(qty) || qty <= 0) {
      Alert.alert(t('productConfirm.errorQuantite'));
      return;
    }

    // Validate date if provided (YYYY-MM-DD)
    let isoDate: string | null = null;
    if (datePeremption.trim()) {
      const parts = datePeremption.trim().split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else {
        Alert.alert(t('productConfirm.errorDateFormat'));
        return;
      }
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert(t('productConfirm.errorNotLoggedIn'));
        return;
      }

      // Get user's foyer
      const { data: membre } = await supabase
        .from('foyer_membres')
        .select('foyer_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!membre) {
        Alert.alert(t('productConfirm.errorNoFoyer'));
        return;
      }

      const draft: StockItemDraft = {
        scannedProduct: { ...initial, nom: nom.trim() },
        quantite: qty,
        unite,
        datePeremption: isoDate,
        lieu,
      };

      await addToStock(draft, membre.foyer_id as string, session.user.id);

      router.replace('/(tabs)/stock');
    } catch {
      Alert.alert(t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('productConfirm.title')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Not found banner */}
          {notFound && (
            <View style={styles.banner}>
              <Ionicons name="information-circle-outline" size={18} color="#1565C0" />
              <Text style={styles.bannerText}>{t('productConfirm.notFound')}</Text>
            </View>
          )}

          {/* Product image */}
          {initial.imageUrl ? (
            <Image source={{ uri: initial.imageUrl }} style={styles.productImage} resizeMode="contain" />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="image-outline" size={40} color="#D1D5DB" />
            </View>
          )}

          {/* Nom */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('productConfirm.nom')}</Text>
            <TextInput
              style={styles.input}
              value={nom}
              onChangeText={setNom}
              placeholder={t('productConfirm.nomPlaceholder')}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Marque (readonly) */}
          {initial.marque ? (
            <View style={styles.field}>
              <Text style={styles.label}>{t('productConfirm.marque')}</Text>
              <Text style={styles.readonlyValue}>{initial.marque}</Text>
            </View>
          ) : null}

          {/* Quantité + Unité */}
          <View style={styles.row}>
            <View style={[styles.field, styles.flex]}>
              <Text style={styles.label}>{t('productConfirm.quantite')}</Text>
              <TextInput
                style={styles.input}
                value={quantite}
                onChangeText={setQuantite}
                keyboardType="decimal-pad"
                placeholder="1"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={[styles.field, { width: 110 }]}>
              <Text style={styles.label}>{t('productConfirm.unite')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.uniteRow}>
                  {UNITES.map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.uniteChip, unite === u && styles.uniteChipActive]}
                      onPress={() => setUnite(u)}
                    >
                      <Text style={[styles.uniteChipText, unite === u && styles.uniteChipTextActive]}>
                        {u}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>

          {/* Date de péremption */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('productConfirm.datePeremption')}</Text>
            <TextInput
              style={styles.input}
              value={datePeremption}
              onChangeText={setDatePeremption}
              placeholder="JJ/MM/AAAA"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>

          {/* Lieu */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('productConfirm.lieu')}</Text>
            <View style={styles.lieuRow}>
              {LIEUX.map((l) => (
                <TouchableOpacity
                  key={l.value}
                  style={[styles.lieuBtn, lieu === l.value && styles.lieuBtnActive]}
                  onPress={() => setLieu(l.value)}
                >
                  <Ionicons
                    name={l.icon as any}
                    size={20}
                    color={lieu === l.value ? '#FF8400' : '#6B7280'}
                  />
                  <Text style={[styles.lieuBtnText, lieu === l.value && styles.lieuBtnTextActive]}>
                    {t(l.label)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>{t('productConfirm.addToStock')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F3F0' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F3F0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111111' },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 12,
  },
  bannerText: { flex: 1, fontSize: 13, color: '#1565C0' },
  productImage: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  productImagePlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111111',
  },
  readonlyValue: { fontSize: 15, color: '#6B7280', paddingHorizontal: 14, paddingVertical: 4 },
  row: { flexDirection: 'row', gap: 12 },
  uniteRow: { flexDirection: 'row', gap: 6 },
  uniteChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  uniteChipActive: { backgroundColor: '#FFF3E0', borderColor: '#FF8400' },
  uniteChipText: { fontSize: 13, color: '#6B7280' },
  uniteChipTextActive: { color: '#FF8400', fontWeight: '600' },
  lieuRow: { flexDirection: 'row', gap: 10 },
  lieuBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  lieuBtnActive: { backgroundColor: '#FFF3E0', borderColor: '#FF8400' },
  lieuBtnText: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  lieuBtnTextActive: { color: '#FF8400', fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#FF8400',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
