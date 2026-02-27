import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';

interface StockIngredient {
  tag: string;
  datePeremption: string | null;
  daysLeft: number | null;
}

interface Props {
  visible: boolean;
  selectedTags: string[];
  onClose: () => void;
  onConfirm: (tags: string[]) => void;
}

export function formatTag(tag: string): string {
  return tag.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function calcDaysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

export function IngredientPickerSheet({ visible, selectedTags, onClose, onConfirm }: Props) {
  const [ingredients, setIngredients] = useState<StockIngredient[]>([]);
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selectedTags));
  const [soonOnly, setSoonOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start();
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setLocalSelected(new Set(selectedTags));
      loadIngredients();
    }
  }, [visible]);

  async function loadIngredients() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: membre } = await supabase
        .from('foyer_membres')
        .select('foyer_id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (!membre?.foyer_id) return;

      const { data } = await supabase
        .from('stock_items')
        .select('ingredient_tag, date_peremption')
        .eq('foyer_id', membre.foyer_id as string)
        .not('ingredient_tag', 'is', null)
        .order('date_peremption', { ascending: true, nullsFirst: false });

      if (!data) return;

      const map = new Map<string, StockIngredient>();
      for (const row of data as { ingredient_tag: string; date_peremption: string | null }[]) {
        if (!map.has(row.ingredient_tag)) {
          map.set(row.ingredient_tag, {
            tag: row.ingredient_tag,
            datePeremption: row.date_peremption,
            daysLeft: calcDaysLeft(row.date_peremption),
          });
        }
      }

      setIngredients(
        Array.from(map.values()).sort((a, b) => formatTag(a.tag).localeCompare(formatTag(b.tag))),
      );
    } finally {
      setLoading(false);
    }
  }

  const displayed = soonOnly
    ? ingredients.filter((i) => i.daysLeft !== null && i.daysLeft <= 7)
    : ingredients;

  const sorted = soonOnly
    ? [...displayed].sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))
    : displayed;

  function toggle(tag: string) {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [700, 0] });
  const backdropOpacity = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] });

  const n = localSelected.size;
  const confirmLabel = n > 0
    ? `Voir les recettes avec ${n} ingrédient${n > 1 ? 's' : ''}`
    : 'Fermer';

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.container}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Ingrédients à inclure</Text>
            <Text style={styles.subtitle}>Les recettes seront triées par matching</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={styles.toggleRow}>
            <Ionicons name="alarm-outline" size={15} color={soonOnly ? '#EF4444' : '#9CA3AF'} />
            <Text style={[styles.toggleLabel, soonOnly && styles.toggleLabelOn]}>
              Expire bientôt (≤ 7 jours)
            </Text>
            <Switch
              value={soonOnly}
              onValueChange={setSoonOnly}
              trackColor={{ true: '#FCA5A5', false: '#E5E7EB' }}
              thumbColor={soonOnly ? '#EF4444' : '#FFFFFF'}
            />
          </View>

          <FlatList
            data={sorted}
            keyExtractor={(i) => i.tag}
            renderItem={({ item }) => {
              const selected = localSelected.has(item.tag);
              const urgent = item.daysLeft !== null && item.daysLeft <= 3;
              return (
                <TouchableOpacity style={styles.row} onPress={() => toggle(item.tag)} activeOpacity={0.7}>
                  <View style={[styles.checkbox, selected && styles.checkboxOn]}>
                    {selected && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                  </View>
                  <Text style={[styles.rowLabel, selected && styles.rowLabelOn]} numberOfLines={1}>
                    {formatTag(item.tag)}
                  </Text>
                  {item.daysLeft !== null && item.daysLeft <= 7 && (
                    <View style={[styles.expiryBadge, urgent && styles.expiryBadgeUrgent]}>
                      <Text style={[styles.expiryText, urgent && styles.expiryTextUrgent]}>
                        {item.daysLeft <= 0 ? 'Expiré' : `J-${item.daysLeft}`}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Text style={styles.emptyText}>
                  {loading ? 'Chargement…' : soonOnly ? 'Aucun ingrédient n\'expire dans 7 jours' : 'Stock vide'}
                </Text>
              </View>
            }
            style={styles.list}
          />

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => onConfirm(Array.from(localSelected))}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '82%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  handle: {
    width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    paddingHorizontal: 20, paddingVertical: 12,
  },
  closeBtn: { position: 'absolute', top: 12, right: 20 },
  title: { fontSize: 16, fontWeight: '700', color: '#111111', marginBottom: 2 },
  subtitle: { fontSize: 12, color: '#9CA3AF' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 10,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F3F4F6', marginBottom: 4,
  },
  toggleLabel: { flex: 1, fontSize: 14, color: '#6B7280' },
  toggleLabelOn: { color: '#EF4444', fontWeight: '500' },
  list: { flexShrink: 1 },
  separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 54 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 13,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#FF8400', borderColor: '#FF8400' },
  rowLabel: { flex: 1, fontSize: 15, color: '#374151' },
  rowLabelOn: { color: '#111111', fontWeight: '600' },
  expiryBadge: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  expiryBadgeUrgent: { backgroundColor: '#FEE2E2' },
  expiryText: { fontSize: 11, fontWeight: '600', color: '#B45309' },
  expiryTextUrgent: { color: '#DC2626' },
  emptyList: { padding: 28, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  footer: { paddingHorizontal: 16, paddingTop: 12 },
  confirmBtn: {
    backgroundColor: '#FF8400', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
