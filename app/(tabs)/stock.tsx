import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react-native';

import { Text } from '@/components/atoms/Text';
import { LocationFilter } from '@/components/molecules/LocationFilter';
import { SearchBar } from '@/components/molecules/SearchBar';
import { ProductGrid } from '@/components/organisms/ProductGrid';
import { useStock, type StockItemDisplay } from '@/features/stock/hooks/useStock';
import { groupByCategory } from '@/features/stock/utils/groupByCategory';
import { colors, spacing } from '@/lib/theme';

type FilterValue = 'all' | 'frigo' | 'congelateur' | 'placard';

const SCHEME = 'light';

export default function StockScreen() {
  const { t } = useTranslation();
  const { items, loading, refreshing, refetch, deleteItem } = useStock();
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, []),
  );

  const filteredItems = useMemo(() => {
    return activeFilter === 'all'
      ? items
      : items.filter((item) => item.lieu === activeFilter);
  }, [items, activeFilter]);

  const sections = useMemo(
    () => groupByCategory(filteredItems, searchQuery),
    [filteredItems, searchQuery],
  );

  function confirmDelete(item: StockItemDisplay) {
    Alert.alert(t('stock.deleteConfirmTitle'), item.nom, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteItem(item.id) },
    ]);
  }

  const theme = colors[SCHEME];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <Text variant="h2" scheme={SCHEME}>{t('stock.title')}</Text>
      </View>

      {/* Filtres emplacement */}
      <LocationFilter
        value={activeFilter}
        onChange={setActiveFilter}
        scheme={SCHEME}
      />

      {/* Barre de recherche */}
      <View style={styles.searchWrapper}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          scheme={SCHEME}
        />
      </View>

      {/* Contenu */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : (
        <ProductGrid
          sections={sections}
          onItemPress={confirmDelete}
          refreshing={refreshing}
          onRefresh={refetch}
          scheme={SCHEME}
          emptyComponent={
            <View style={styles.emptyState}>
              <Text variant="bodyMedium" scheme={SCHEME} color={theme.text.secondary}>
                {t('stock.noItemsInLieu')}
              </Text>
              <Text variant="label" scheme={SCHEME} color={theme.text.muted} style={styles.emptySubtitle}>
                {t('stock.noItemsInLieuSub')}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  searchWrapper: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
  },
  emptySubtitle: {
    textAlign: 'center',
  },
});
