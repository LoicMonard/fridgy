import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { addReceiptItemsToStock } from '@/features/stock/services/stockService';
import type { Lieu, ReceiptItemDraft, ReceiptProduct } from '@/features/scanning/types';

const LIEUX: { value: Lieu; icon: string }[] = [
  { value: 'frigo', icon: 'snow-outline' },
  { value: 'placard', icon: 'cube-outline' },
  { value: 'congelateur', icon: 'thermometer-outline' },
];

const UNITS = ['unite', 'g', 'kg', 'L', 'mL', 'lot'];

function computeDefaultDate(jours: number | undefined): Date | null {
  if (!jours) return null;
  return new Date(Date.now() + jours * 86_400_000);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface EditableItem {
  id: string;
  nom: string;
  quantite: number;
  quantiteStr: string;
  unite: string;
  lieu: Lieu;
  datePeremption: Date | null;
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
      quantiteStr: String(item.quantiteEstimee ?? 1),
      unite: item.unite ?? 'unite',
      lieu: 'frigo',
      datePeremption: computeDefaultDate(item.dureeConservationJours),
      checked: true,
      ingredientTag: item.ingredientTag,
      dureeConservationJours: item.dureeConservationJours,
    })),
  );
  const [saving, setSaving] = useState(false);

  // Date picker state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerItemId, setPickerItemId] = useState<string | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());

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

  function updateQtyStr(id: string, text: string) {
    const parsed = parseFloat(text);
    setEditableItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantiteStr: text,
              ...(!isNaN(parsed) && parsed > 0 ? { quantite: parsed } : {}),
            }
          : item,
      ),
    );
  }

  function normalizeQty(id: string) {
    setEditableItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantiteStr: String(item.quantite) } : item,
      ),
    );
  }

  function updateUnite(id: string, unite: string) {
    setEditableItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unite } : item)),
    );
  }

  function updateLieu(id: string, lieu: Lieu) {
    setEditableItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, lieu } : item)),
    );
  }

  function clearDate(id: string) {
    setEditableItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, datePeremption: null } : item)),
    );
  }

  function openDatePicker(id: string, current: Date | null) {
    setPickerItemId(id);
    setPickerDate(current ?? new Date());
    setPickerVisible(true);
  }

  function handlePickerChange(_: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      setPickerVisible(false);
      if (date && pickerItemId) {
        setEditableItems((prev) =>
          prev.map((item) =>
            item.id === pickerItemId ? { ...item, datePeremption: date } : item,
          ),
        );
      }
      setPickerItemId(null);
    } else {
      if (date) setPickerDate(date);
    }
  }

  function confirmIOSDate() {
    if (pickerItemId) {
      setEditableItems((prev) =>
        prev.map((item) =>
          item.id === pickerItemId ? { ...item, datePeremption: pickerDate } : item,
        ),
      );
    }
    setPickerVisible(false);
    setPickerItemId(null);
  }

  function pickUnit(id: string, currentUnite: string) {
    Alert.alert(
      t('receiptConfirm.pickUnit'),
      undefined,
      [
        ...UNITS.map((u) => ({
          text: u === currentUnite ? `${u} ✓` : u,
          onPress: () => updateUnite(id, u),
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ],
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
          datePeremption: item.datePeremption?.toISOString().split('T')[0] ?? null,
          lieu: item.lieu,
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
                  {/* Row 1: checkbox + name */}
                  <View style={styles.row1}>
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
                  </View>

                  {/* Row 2: qty + unit + lieu (checked only) */}
                  {item.checked && (
                    <View style={styles.row2}>
                      <TextInput
                        style={styles.qtyInput}
                        value={item.quantiteStr}
                        onChangeText={(text) => updateQtyStr(item.id, text)}
                        onBlur={() => normalizeQty(item.id)}
                        keyboardType="numeric"
                        selectTextOnFocus
                      />
                      <TouchableOpacity
                        style={styles.unitBtn}
                        onPress={() => pickUnit(item.id, item.unite)}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                      >
                        <Text style={styles.unitBtnText}>{item.unite}</Text>
                        <Ionicons name="chevron-down" size={10} color="#9CA3AF" />
                      </TouchableOpacity>

                      <View style={styles.rowSpacer} />

                      {LIEUX.map((l) => (
                        <TouchableOpacity
                          key={l.value}
                          style={[styles.lieuBtn, item.lieu === l.value && styles.lieuBtnActive]}
                          onPress={() => updateLieu(item.id, l.value)}
                          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                        >
                          <Ionicons
                            name={l.icon as never}
                            size={15}
                            color={item.lieu === l.value ? '#FF8400' : '#9CA3AF'}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Row 3: expiry date (checked only) */}
                  {item.checked && (
                    <View style={styles.row3}>
                      <TouchableOpacity
                        style={[
                          styles.dateBadge,
                          item.datePeremption ? styles.dateBadgeFilled : styles.dateBadgeEmpty,
                        ]}
                        onPress={() => openDatePicker(item.id, item.datePeremption)}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={13}
                          color={item.datePeremption ? '#FF8400' : '#9CA3AF'}
                        />
                        <Text
                          style={[
                            styles.dateBadgeText,
                            item.datePeremption && styles.dateBadgeTextFilled,
                          ]}
                        >
                          {item.datePeremption
                            ? formatDate(item.datePeremption)
                            : t('receiptConfirm.addDate')}
                        </Text>
                      </TouchableOpacity>

                      {item.datePeremption && (
                        <TouchableOpacity
                          onPress={() => clearDate(item.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close-circle" size={16} color="#D1D5DB" />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Sticky footer: CTA */}
        <SafeAreaView edges={['bottom']} style={styles.footer}>
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

      {/* Android: picker renders directly (dialog auto-dismisses) */}
      {pickerVisible && Platform.OS === 'android' && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          onChange={handlePickerChange}
        />
      )}

      {/* iOS: picker in a bottom sheet */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={pickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setPickerVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setPickerVisible(false)}
          />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Text style={styles.pickerCancel}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>{t('receiptConfirm.addDate')}</Text>
              <TouchableOpacity onPress={confirmIOSDate}>
                <Text style={styles.pickerConfirm}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={pickerDate}
              mode="date"
              display="spinner"
              onChange={handlePickerChange}
              locale="fr-FR"
            />
          </View>
        </Modal>
      )}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  itemCardUnchecked: { backgroundColor: '#F9FAFB', opacity: 0.55 },

  row1: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 36,
    gap: 6,
  },
  row3: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 36,
    gap: 6,
  },
  rowSpacer: { flex: 1 },

  checkbox: { padding: 2 },

  itemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111111',
    paddingVertical: 4,
  },
  itemNameUnchecked: { color: '#9CA3AF', textDecorationLine: 'line-through' },

  qtyInput: {
    width: 58,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 5,
    backgroundColor: '#F9FAFB',
  },

  unitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#F9FAFB',
  },
  unitBtnText: { fontSize: 12, fontWeight: '500', color: '#6B7280' },

  lieuBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  lieuBtnActive: { backgroundColor: '#FFF3E0', borderColor: '#FF8400' },

  dateBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateBadgeEmpty: {
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  dateBadgeFilled: {
    borderColor: '#FF8400',
    borderStyle: 'solid',
    backgroundColor: '#FFF3E0',
  },
  dateBadgeText: { fontSize: 12, color: '#9CA3AF' },
  dateBadgeTextFilled: { color: '#FF8400', fontWeight: '500' },

  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  saveBtn: {
    backgroundColor: '#FF8400',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Date picker modal (iOS)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerTitle: { fontSize: 15, fontWeight: '600', color: '#111111' },
  pickerCancel: { fontSize: 15, color: '#6B7280' },
  pickerConfirm: { fontSize: 15, color: '#FF8400', fontWeight: '600' },
});
