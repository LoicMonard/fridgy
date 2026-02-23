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
  quantite: number;
  unite: string;
  checked: boolean;
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
      quantite: item.quantiteEstimee ?? 1,
      unite: item.unite ?? 'unite',
      checked: true,
      ingredientTag: item.ingredientTag,
      dureeConservationJours: item.dureeConservationJours,
    })),
  );
  const [lieu, setLieu] = useState<Lieu>('frigo');
  const [saving, setSaving] = useState(false);

  const checkedItems = editableItems.filter((item) => item.checked);

  function toggleItem(id: string) {
    setEditableItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
    );
  }

  function updateName(id: string, nom: string) {
    setEditableItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, nom } : item)),
    );
  }

  function updateQty(id: string, delta: number) {
    setEditableItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantite: Math.max(1, item.quantite + delta) } : item,
      ),
    );
  }

  async function handleSaveAll() {
    if (checkedItems.length === 0) {
      Alert.alert(t('receiptConfirm.errorNoItems'));
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
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

      const drafts: ReceiptItemDraft[] = checkedItems
        .filter((item) => item.nom.trim())
        .map((item) => ({
          nom: item.nom.trim(),
          ingredientTag: item.ingredientTag,
          quantite: item.quantite,
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color="#111111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('receiptConfirm.title')}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{checkedItems.length}/{editableItems.length}</Text>
          </View>
        </View>

        {/* Items list */}
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {editableItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>{t('receiptConfirm.empty')}</Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {editableItems.map((item) => (
                <View key={item.id} style={[styles.itemCard, !item.checked && styles.itemCardUnchecked]}>
                  <TouchableOpacity
                    onPress={() => toggleItem(item.id)}
                    style={styles.checkbox}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <Ionicons
                      name={item.checked ? 'checkmark-circle' : 'ellipse-outline'}
                      size={26}
                      color={item.checked ? '#FF8400' : '#D1D5DB'}
                    />
                  </TouchableOpacity>

                  <TextInput
                    style={[styles.itemName, !item.checked && styles.itemNameUnchecked]}
                    value={item.nom}
                    onChangeText={(text) => updateName(item.id, text)}
                    editable={item.checked}
                    placeholderTextColor="#9CA3AF"
                  />

                  {item.checked && (
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        onPress={() => updateQty(item.id, -1)}
                        style={styles.stepperBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                      >
                        <Ionicons name="remove" size={16} color="#6B7280" />
                      </TouchableOpacity>
                      <Text style={styles.stepperValue}>
                        {item.quantite}
                        {item.unite !== 'unite' && (
                          <Text style={styles.stepperUnit}> {item.unite}</Text>
                        )}
                      </Text>
                      <TouchableOpacity
                        onPress={() => updateQty(item.id, 1)}
                        style={styles.stepperBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                      >
                        <Ionicons name="add" size={16} color="#6B7280" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Sticky footer: lieu + CTA */}
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <View style={styles.lieuRow}>
            <Text style={styles.lieuLabel}>{t('receiptConfirm.lieu')}</Text>
            <View style={styles.lieuBtns}>
              {LIEUX.map((l) => (
                <TouchableOpacity
                  key={l.value}
                  style={[styles.lieuBtn, lieu === l.value && styles.lieuBtnActive]}
                  onPress={() => setLieu(l.value)}
                >
                  <Ionicons
                    name={l.icon as never}
                    size={15}
                    color={lieu === l.value ? '#FF8400' : '#9CA3AF'}
                  />
                  <Text style={[styles.lieuBtnText, lieu === l.value && styles.lieuBtnTextActive]}>
                    {t(l.label)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, (saving || checkedItems.length === 0) && styles.saveBtnDisabled]}
            onPress={handleSaveAll}
            disabled={saving || checkedItems.length === 0}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>
                {t('receiptConfirm.addAll', { count: checkedItems.length })}
              </Text>
            )}
          </TouchableOpacity>
        </SafeAreaView>
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#111111' },
  countBadge: {
    backgroundColor: '#FF8400',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countBadgeText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },

  emptyState: { alignItems: 'center', gap: 12, paddingVertical: 60 },
  emptyText: { fontSize: 15, color: '#9CA3AF', textAlign: 'center' },

  itemsList: { gap: 8 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    minHeight: 56,
  },
  itemCardUnchecked: { backgroundColor: '#F9FAFB', opacity: 0.55 },

  checkbox: { padding: 2 },

  itemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111111',
    paddingVertical: 4,
  },
  itemNameUnchecked: { color: '#9CA3AF', textDecorationLine: 'line-through' },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 6,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  stepperValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
    minWidth: 28,
    textAlign: 'center',
  },
  stepperUnit: { fontSize: 12, fontWeight: '400', color: '#6B7280' },

  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  lieuRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lieuLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  lieuBtns: { flex: 1, flexDirection: 'row', gap: 8 },
  lieuBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  lieuBtnActive: { backgroundColor: '#FFF3E0', borderColor: '#FF8400' },
  lieuBtnText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  lieuBtnTextActive: { color: '#FF8400', fontWeight: '600' },

  saveBtn: {
    backgroundColor: '#FF8400',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
