import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useTranslation } from 'react-i18next';
import { useStock, type StockItemDisplay } from '@/features/stock/hooks/useStock';

type Lieu = 'frigo' | 'congelateur' | 'placard';

const LIEUX: { value: Lieu; labelKey: string; icon: string }[] = [
  { value: 'frigo', labelKey: 'stock.frigo', icon: 'snow-outline' },
  { value: 'placard', labelKey: 'stock.placard', icon: 'cube-outline' },
  { value: 'congelateur', labelKey: 'stock.congelateur', icon: 'thermometer-outline' },
];

interface ExpiryBadge {
  color: string;
  bg: string;
  label: string;
}

function getExpiryBadge(dateStr: string | null): ExpiryBadge | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);

  const shortDate = expiry.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  if (diffDays < 0) return { color: '#EF4444', bg: '#FEE2E2', label: 'Expiré' };
  if (diffDays === 0) return { color: '#EF4444', bg: '#FEE2E2', label: "Auj." };
  if (diffDays === 1) return { color: '#EF4444', bg: '#FEE2E2', label: 'Demain' };
  if (diffDays <= 3) return { color: '#EF4444', bg: '#FEE2E2', label: `J-${diffDays}` };
  if (diffDays <= 7) return { color: '#F59E0B', bg: '#FEF3C7', label: shortDate };
  return { color: '#16A34A', bg: '#DCFCE7', label: shortDate };
}

export default function StockScreen() {
  const { t } = useTranslation();
  const { items, loading, refreshing, refetch, deleteItem } = useStock();
  const [activeLieu, setActiveLieu] = useState<Lieu>('frigo');

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, []),
  );

  const filteredItems = items.filter((item) => item.lieu === activeLieu);

  const counts: Record<Lieu, number> = {
    frigo: items.filter((i) => i.lieu === 'frigo').length,
    placard: items.filter((i) => i.lieu === 'placard').length,
    congelateur: items.filter((i) => i.lieu === 'congelateur').length,
  };

  function confirmDelete(item: StockItemDisplay) {
    Alert.alert(t('stock.deleteConfirmTitle'), item.nom, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteItem(item.id) },
    ]);
  }

  function renderItem({ item }: { item: StockItemDisplay }) {
    const badge = getExpiryBadge(item.datePeremption);
    let swipeRef: Swipeable | null = null;

    return (
      <Swipeable
        ref={(r) => { swipeRef = r; }}
        renderRightActions={() => (
          <TouchableOpacity
            style={styles.deleteAction}
            onPress={() => {
              swipeRef?.close();
              confirmDelete(item);
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            <Text style={styles.deleteActionText}>{t('common.delete')}</Text>
          </TouchableOpacity>
        )}
        rightThreshold={60}
        overshootRight={false}
      >
        <View style={styles.itemCard}>
          <Text style={styles.itemName} numberOfLines={2}>{item.nom}</Text>
          <View style={styles.itemFooter}>
            <Text style={styles.itemQty}>
              {item.quantite % 1 === 0 ? item.quantite : item.quantite.toFixed(1)}{' '}
              <Text style={styles.itemUnite}>{item.unite}</Text>
            </Text>
            {badge && (
              <View style={[styles.expiryBadge, { backgroundColor: badge.bg }]}>
                <View style={[styles.expiryDot, { backgroundColor: badge.color }]} />
                <Text style={[styles.expiryLabel, { color: badge.color }]}>{badge.label}</Text>
              </View>
            )}
          </View>
        </View>
      </Swipeable>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('stock.title')}</Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {LIEUX.map((l) => {
          const active = activeLieu === l.value;
          return (
            <TouchableOpacity
              key={l.value}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveLieu(l.value)}
            >
              <Ionicons
                name={l.icon as never}
                size={15}
                color={active ? '#FF8400' : '#9CA3AF'}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {t(l.labelKey)}
              </Text>
              {counts[l.value] > 0 && (
                <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>
                    {counts[l.value]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#FF8400" size="large" />
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name={LIEUX.find((l) => l.value === activeLieu)!.icon as never}
            size={44}
            color="#D1D5DB"
          />
          <Text style={styles.emptyTitle}>{t('stock.noItemsInLieu')}</Text>
          <Text style={styles.emptySubtitle}>{t('stock.noItemsInLieuSub')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={refetch}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F3F0' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111111' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: '#FFF3E0' },
  tabLabel: { fontSize: 13, fontWeight: '500', color: '#9CA3AF' },
  tabLabelActive: { color: '#FF8400', fontWeight: '600' },
  tabBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabBadgeActive: { backgroundColor: '#FDBA74' },
  tabBadgeText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  tabBadgeTextActive: { color: '#FFFFFF' },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  separator: { height: 8 },

  // Item card
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111111' },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemQty: { fontSize: 13, fontWeight: '600', color: '#374151' },
  itemUnite: { fontSize: 13, fontWeight: '400', color: '#6B7280' },

  // Expiry badge
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  expiryDot: { width: 6, height: 6, borderRadius: 3 },
  expiryLabel: { fontSize: 12, fontWeight: '600' },

  // Swipe delete action
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 14,
    marginLeft: 8,
    gap: 4,
  },
  deleteActionText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },

  // States
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 40 },
});
