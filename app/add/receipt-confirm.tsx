import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { addReceiptItemsToStock } from '@/features/stock/services/stockService';
import type { Lieu, ReceiptItemDraft, ReceiptProduct } from '@/features/scanning/types';

const LIEUX: { value: Lieu; label: string; icon: string }[] = [
  { value: 'frigo', label: 'productConfirm.frigo', icon: 'snow-outline' },
  { value: 'placard', label: 'productConfirm.placard', icon: 'cube-outline' },
  { value: 'congelateur', label: 'productConfirm.congelateur', icon: 'thermometer-outline' },
];

interface EditableItem {
  id: string;
  nom: string;
  quantite: string;
  unite: string;
  ingredientTag?: string;
  dureeConservationJours?: number;
}

export default function ReceiptConfirmScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ items: string }>();

  const initial: ReceiptProduct[] = JSON.parse(params.items ?? '[]');

  const [editableItems, setEditableItems] = useState<EditableItem[]>(
    initial.map((item, i) => ({
      id: String(i),
      nom: item.nom,
      quantite: String(item.quantiteEstimee ?? 1),
      unite: item.unite ?? 'unite',
      ingredientTag: item.ingredientTag,
      dureeConservationJours: item.dureeConservationJours,
    })),
  );
  const [lieu, setLieu] = useState<Lieu>('frigo');
  const [saving, setSaving] = useState(false);

  function updateItem(id: string, patch: Partial<EditableItem>) {
    setEditableItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    setEditableItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleSaveAll() {
    const validItems = editableItems.filter((item) => item.nom.trim());
    if (validItems.length === 0) {
      Alert.alert(t('receiptConfirm.errorNoItems'));
      return;
    }

    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data: membre } = await supabase
        .from('foyer_membres')
        .select('foyer_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!membre) {
        Alert.alert(t('productConfirm.errorNoFoyer'));
        return;
      }

      const drafts: ReceiptItemDraft[] = validItems.map((item) => ({
        nom: item.nom.trim(),
        ingredientTag: item.ingredientTag,
        quantite: parseFloat(item.quantite.replace(',', '.')) || 1,
        unite: item.unite,
        dureeConservationJours: item.dureeConservationJours,
        lieu,
      }));

      await addReceiptItemsToStock(drafts, membre.foyer_id as string, session.user.id);
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
          <View style={styles.flex}>
            <Text style={styles.headerTitle}>{t('receiptConfirm.title')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('receiptConfirm.itemCount', { count: editableItems.length })}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Lieu global */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('receiptConfirm.lieu')}</Text>
            <View style={styles.lieuRow}>
              {LIEUX.map((l) => (
                <TouchableOpacity
                  key={l.value}
                  style={[styles.lieuBtn, lieu === l.value && styles.lieuBtnActive]}
                  onPress={() => setLieu(l.value)}
                >
                  <Ionicons
                    name={l.icon as never}
                    size={18}
                    color={lieu === l.value ? '#FF8400' : '#6B7280'}
                  />
                  <Text style={[styles.lieuBtnText, lieu === l.value && styles.lieuBtnTextActive]}>
                    {t(l.label)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Items list */}
          {editableItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>{t('receiptConfirm.empty')}</Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {editableItems.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemRow}>
                    <TextInput
                      style={[styles.input, styles.inputNom]}
                      value={item.nom}
                      onChangeText={(text) => updateItem(item.id, { nom: text })}
                      placeholder={t('productConfirm.nomPlaceholder')}
                      placeholderTextColor="#9CA3AF"
                    />
                    <TouchableOpacity
                      onPress={() => removeItem(item.id)}
                      style={styles.removeBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.itemRow}>
                    <TextInput
                      style={[styles.input, styles.inputQty]}
                      value={item.quantite}
                      onChangeText={(text) => updateItem(item.id, { quantite: text })}
                      keyboardType="decimal-pad"
                    />
                    <TextInput
                      style={[styles.input, styles.inputUnite]}
                      value={item.unite}
                      onChangeText={(text) => updateItem(item.id, { unite: text })}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Save button */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              (saving || editableItems.length === 0) && styles.saveBtnDisabled,
            ]}
            onPress={handleSaveAll}
            disabled={saving || editableItems.length === 0}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>
                {t('receiptConfirm.addAll', { count: editableItems.length })}
              </Text>
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
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lieuRow: { flexDirection: 'row', gap: 10 },
  lieuBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  lieuBtnActive: { backgroundColor: '#FFF3E0', borderColor: '#FF8400' },
  lieuBtnText: { fontSize: 12, color: '#6B7280' },
  lieuBtnTextActive: { color: '#FF8400', fontWeight: '600' },
  itemsList: { gap: 10 },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#111111',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputNom: { flex: 1 },
  inputQty: { width: 64 },
  inputUnite: { width: 80 },
  removeBtn: { padding: 2 },
  emptyState: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  emptyText: { fontSize: 15, color: '#9CA3AF', textAlign: 'center' },
  saveBtn: {
    backgroundColor: '#FF8400',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
