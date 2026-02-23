import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useRecipes, type FavoriteRecipe, type ScoredRecipe } from '@/features/recipes/hooks/useRecipes';

type Tab = 'suggestions' | 'favorites';

function Scorebadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const isHigh = score >= 0.8;
  const isMid = score >= 0.5;
  const color = isHigh ? '#16A34A' : isMid ? '#F59E0B' : '#9CA3AF';
  const bg = isHigh ? '#DCFCE7' : isMid ? '#FEF3C7' : '#F3F4F6';
  const label = score >= 1 ? '✓ Complet' : `${pct}%`;
  return (
    <View style={[styles.scoreBadge, { backgroundColor: bg }]}>
      <Text style={[styles.scoreBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

function TimeChip({ minutes }: { minutes: number | null }) {
  if (!minutes) return null;
  return (
    <View style={styles.timeChip}>
      <Ionicons name="time-outline" size={12} color="#9CA3AF" />
      <Text style={styles.timeChipText}>{minutes} min</Text>
    </View>
  );
}

function SuggestionCard({ item }: { item: ScoredRecipe }) {
  const missing = item.missingTags.length;
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/recipes/[id]', params: { id: item.id } })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.titre}</Text>
        <Scorebadge score={item.score} />
      </View>
      <View style={styles.cardFooter}>
        <TimeChip minutes={(item.tempsPrepMin ?? 0) + (item.tempsCuissonMin ?? 0)} />
        {missing > 0 && (
          <View style={styles.missingChip}>
            <Ionicons name="alert-circle-outline" size={12} color="#EF4444" />
            <Text style={styles.missingChipText}>
              {missing} ingrédient{missing > 1 ? 's' : ''} manquant{missing > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function FavoriteCard({ item }: { item: FavoriteRecipe }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/recipes/[id]', params: { id: item.id } })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.titre}</Text>
        <Ionicons name="heart" size={18} color="#EF4444" />
      </View>
      <View style={styles.cardFooter}>
        <TimeChip minutes={(item.tempsPrepMin ?? 0) + (item.tempsCuissonMin ?? 0)} />
      </View>
    </TouchableOpacity>
  );
}

export default function RecipesScreen() {
  const { t } = useTranslation();
  const { suggestions, favorites, loading, refreshing, refetch } = useRecipes();
  const [activeTab, setActiveTab] = useState<Tab>('suggestions');

  useFocusEffect(useCallback(() => { refetch(); }, []));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('recipes.title')}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'suggestions' && styles.tabActive]}
          onPress={() => setActiveTab('suggestions')}
        >
          <Ionicons name="bulb-outline" size={15} color={activeTab === 'suggestions' ? '#FF8400' : '#9CA3AF'} />
          <Text style={[styles.tabLabel, activeTab === 'suggestions' && styles.tabLabelActive]}>
            {t('recipes.suggestions')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'favorites' && styles.tabActive]}
          onPress={() => setActiveTab('favorites')}
        >
          <Ionicons name="heart-outline" size={15} color={activeTab === 'favorites' ? '#FF8400' : '#9CA3AF'} />
          <Text style={[styles.tabLabel, activeTab === 'favorites' && styles.tabLabelActive]}>
            {t('recipes.favorites')}
          </Text>
          {favorites.length > 0 && (
            <View style={[styles.tabBadge, activeTab === 'favorites' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'favorites' && styles.tabBadgeTextActive]}>
                {favorites.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#FF8400" size="large" />
        </View>
      ) : activeTab === 'suggestions' ? (
        suggestions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="basket-outline" size={44} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>{t('recipes.emptySuggestionsTitle')}</Text>
            <Text style={styles.emptySubtitle}>{t('recipes.emptySuggestionsSub')}</Text>
          </View>
        ) : (
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <SuggestionCard item={item} />}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={refetch}
          />
        )
      ) : (
        favorites.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={44} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>{t('recipes.emptyFavoritesTitle')}</Text>
            <Text style={styles.emptySubtitle}>{t('recipes.emptyFavoritesSub')}</Text>
          </View>
        ) : (
          <FlatList
            data={favorites}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <FavoriteCard item={item} />}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={refetch}
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F3F0' },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
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
  tabBadge: { backgroundColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeActive: { backgroundColor: '#FDBA74' },
  tabBadgeText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  tabBadgeTextActive: { color: '#FFFFFF' },

  // Cards
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111111' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Score badge
  scoreBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  scoreBadgeText: { fontSize: 12, fontWeight: '700' },

  // Time chip
  timeChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeChipText: { fontSize: 12, color: '#9CA3AF' },

  // Missing chip
  missingChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  missingChipText: { fontSize: 12, color: '#EF4444' },

  // States
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
});
