import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
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
import { IngredientPickerSheet, formatTag } from '@/features/recipes/components/IngredientPickerSheet';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'suggestions' | 'favorites';

/**
 * Ce soir     — recettes triées par couverture stock (score ≥ 0.5)
 * Anti-gaspi  — recettes qui utilisent le plus d'ingrédients expirant ≤ 7j
 * Courses min — recettes auxquelles il manque 1 ou 2 ingrédients
 * Avec…       — picker libre, triées par matching sur les tags sélectionnés
 */
type IntentMode = 'tonight' | 'expiry' | 'shopping' | 'custom';

// ─── Sub-components ───────────────────────────────────────────────────────────

function TimeChip({ minutes }: { minutes: number | null }) {
  if (!minutes) return null;
  return (
    <View style={styles.timeChip}>
      <Ionicons name="time-outline" size={12} color="#9CA3AF" />
      <Text style={styles.timeChipText}>{minutes} min</Text>
    </View>
  );
}

interface CardBadgeProps {
  mode: IntentMode;
  item: ScoredRecipe;
  matchCount: number;
  totalActiveTags: number;
}

function CardBadge({ mode, item, matchCount, totalActiveTags }: CardBadgeProps) {
  if (mode === 'tonight') {
    const pct = Math.round(item.score * 100);
    const isHigh = item.score >= 0.8;
    const isMid = item.score >= 0.5;
    const color = isHigh ? '#16A34A' : isMid ? '#F59E0B' : '#9CA3AF';
    const bg = isHigh ? '#DCFCE7' : isMid ? '#FEF3C7' : '#F3F4F6';
    const label = item.score >= 1 ? '✓ Complet' : `${pct}%`;
    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color }]}>{label}</Text>
      </View>
    );
  }

  if (mode === 'expiry') {
    return (
      <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
        <Text style={[styles.badgeText, { color: '#B45309' }]}>
          {matchCount}/{totalActiveTags} à utiliser
        </Text>
      </View>
    );
  }

  if (mode === 'shopping') {
    const missing = item.missingTags.slice(0, 2).map(formatTag).join(', ');
    return (
      <View style={[styles.badge, { backgroundColor: '#EFF6FF' }]}>
        <Text style={[styles.badgeText, { color: '#1D4ED8' }]} numberOfLines={1}>
          {missing}
        </Text>
      </View>
    );
  }

  // custom
  return (
    <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
      <Text style={[styles.badgeText, { color: '#16A34A' }]}>
        {matchCount}/{totalActiveTags} ingr.
      </Text>
    </View>
  );
}

function SuggestionCard({
  item,
  mode,
  matchCount,
  totalActiveTags,
}: {
  item: ScoredRecipe;
  mode: IntentMode;
  matchCount: number;
  totalActiveTags: number;
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/recipes/[id]', params: { id: item.id } })}
      activeOpacity={0.75}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.titre}</Text>
        <CardBadge mode={mode} item={item} matchCount={matchCount} totalActiveTags={totalActiveTags} />
      </View>
      <View style={styles.cardFooter}>
        <TimeChip minutes={(item.tempsPrepMin ?? 0) + (item.tempsCuissonMin ?? 0)} />
        {mode === 'tonight' && item.missingTags.length > 0 && (
          <View style={styles.missingChip}>
            <Ionicons name="alert-circle-outline" size={12} color="#EF4444" />
            <Text style={styles.missingChipText}>
              {item.missingTags.length} manquant{item.missingTags.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
        {mode === 'shopping' && item.missingTags.length > 2 && (
          <Text style={styles.missingMore}>+{item.missingTags.length - 2} autres</Text>
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
      activeOpacity={0.75}
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

// ─── Intent chips config ───────────────────────────────────────────────────────

const INTENTS: { key: IntentMode; icon: keyof typeof Ionicons.glyphMap; label: string; color: string; bg: string }[] = [
  { key: 'tonight',  icon: 'restaurant-outline', label: 'Ce soir',         color: '#FF8400', bg: '#FFF3E0' },
  { key: 'expiry',   icon: 'alarm-outline',       label: 'Anti-gaspillage', color: '#EF4444', bg: '#FEF2F2' },
  { key: 'shopping', icon: 'cart-outline',        label: 'Courses min.',    color: '#1D4ED8', bg: '#EFF6FF' },
  { key: 'custom',   icon: 'options-outline',     label: 'Avec…',           color: '#7C3AED', bg: '#F5F3FF' },
];

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RecipesScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('suggestions');
  const [activeMode, setActiveMode] = useState<IntentMode>('tonight');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expiryTags, setExpiryTags] = useState<string[]>([]);
  const [recipeMatchCounts, setRecipeMatchCounts] = useState<Map<string, number> | null>(null);

  // minScore : seulement "Ce soir" garde le threshold 0.5
  const minScore = activeMode === 'tonight' ? 0.5 : 0.0;
  const { suggestions, favorites, loading, refreshing, generating, refetch, generateMore } = useRecipes(minScore);

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  // Charge les tags expirant ≤ 7j quand on passe en mode "Anti-gaspillage"
  useEffect(() => {
    if (activeMode !== 'expiry') return;
    async function loadExpiryTags() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: membre } = await supabase
        .from('foyer_membres').select('foyer_id').eq('user_id', session.user.id).maybeSingle();
      if (!membre?.foyer_id) return;

      const cutoff = new Date(Date.now() + 7 * 86_400_000).toISOString().split('T')[0];
      const { data } = await supabase
        .from('stock_items')
        .select('ingredient_tag')
        .eq('foyer_id', membre.foyer_id as string)
        .not('ingredient_tag', 'is', null)
        .not('date_peremption', 'is', null)
        .lte('date_peremption', cutoff);

      const tags = [...new Set((data ?? []).map((r: { ingredient_tag: string }) => r.ingredient_tag))];
      setExpiryTags(tags);
    }
    loadExpiryTags();
  }, [activeMode]);

  // Tags actifs pour le matching (expiry ou custom)
  const activeTags = useMemo(() => {
    if (activeMode === 'expiry') return expiryTags;
    if (activeMode === 'custom') return selectedTags;
    return [];
  }, [activeMode, expiryTags, selectedTags]);

  // Calcule recipeMatchCounts quand activeTags change
  useEffect(() => {
    if (activeTags.length === 0) {
      setRecipeMatchCounts(null);
      return;
    }
    supabase
      .from('recette_ingredients')
      .select('recette_id')
      .in('ingredient_tag', activeTags)
      .then(({ data }) => {
        const counts = new Map<string, number>();
        for (const row of data ?? []) {
          const id = row.recette_id as string;
          counts.set(id, (counts.get(id) ?? 0) + 1);
        }
        setRecipeMatchCounts(counts);
      });
  }, [activeTags]);

  // Filtrage + tri selon le mode actif
  const filteredSuggestions = useMemo(() => {
    let result = [...suggestions];

    switch (activeMode) {
      case 'tonight':
        // Déjà filtré par minScore=0.5 dans le RPC, rien à faire
        break;

      case 'expiry':
        if (recipeMatchCounts) {
          result = result.filter((s) => (recipeMatchCounts.get(s.id) ?? 0) >= 1);
          result.sort((a, b) => (recipeMatchCounts.get(b.id) ?? 0) - (recipeMatchCounts.get(a.id) ?? 0));
        }
        break;

      case 'shopping':
        result = result.filter((s) => s.missingTags.length >= 1 && s.missingTags.length <= 2);
        result.sort((a, b) => a.missingTags.length - b.missingTags.length);
        break;

      case 'custom':
        if (recipeMatchCounts) {
          result = result.filter((s) => (recipeMatchCounts.get(s.id) ?? 0) >= 1);
          result.sort((a, b) => (recipeMatchCounts.get(b.id) ?? 0) - (recipeMatchCounts.get(a.id) ?? 0));
        }
        break;
    }

    return result;
  }, [suggestions, activeMode, recipeMatchCounts]);

  function handleModeChange(mode: IntentMode) {
    if (mode === 'custom') {
      setPickerVisible(true);
    } else {
      setActiveMode(mode);
    }
  }

  function handlePickerConfirm(tags: string[]) {
    setSelectedTags(tags);
    setActiveMode('custom');
    setPickerVisible(false);
  }

  // Label dynamique du chip "Avec…"
  const customChipLabel = useMemo(() => {
    if (selectedTags.length === 0) return 'Avec…';
    const names = selectedTags.slice(0, 2).map(formatTag);
    return selectedTags.length > 2 ? `${names.join(', ')} +${selectedTags.length - 2}` : names.join(', ');
  }, [selectedTags]);

  // Empty state selon le mode
  const emptyState = useMemo(() => {
    if (generating) return { icon: null, title: t('recipes.generatingTitle'), sub: t('recipes.generatingSub') };
    switch (activeMode) {
      case 'tonight':
        return { icon: 'restaurant-outline' as const, title: t('recipes.emptySuggestionsTitle'), sub: t('recipes.emptySuggestionsSub') };
      case 'expiry':
        return expiryTags.length === 0
          ? { icon: 'checkmark-circle-outline' as const, title: 'Aucun ingrédient n\'expire bientôt', sub: 'Tout ton stock est frais !' }
          : { icon: 'alarm-outline' as const, title: 'Aucune recette trouvée', sub: 'Essaie de générer de nouvelles recettes adaptées à ton stock.' };
      case 'shopping':
        return { icon: 'cart-outline' as const, title: 'Ton stock est bien garni !', sub: 'Aucune recette ne nécessite de courses supplémentaires.' };
      case 'custom':
        return selectedTags.length === 0
          ? { icon: 'options-outline' as const, title: 'Sélectionne des ingrédients', sub: 'Choisis les ingrédients que tu veux absolument utiliser.' }
          : { icon: 'search-outline' as const, title: 'Aucune recette trouvée', sub: 'Aucune recette n\'utilise ces ingrédients. Essaie d\'en générer de nouvelles.' };
    }
  }, [activeMode, generating, expiryTags, selectedTags, t]);

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

      {/* Intent chips — suggestions tab only */}
      {activeTab === 'suggestions' && !loading && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.intentsRow}
          style={styles.intentsScroll}
        >
          {INTENTS.map((intent) => {
            const isActive = activeMode === intent.key;
            const label = intent.key === 'custom' ? customChipLabel : intent.label;
            return (
              <TouchableOpacity
                key={intent.key}
                style={[
                  styles.intentChip,
                  isActive && { backgroundColor: intent.bg, borderColor: intent.color },
                ]}
                onPress={() => handleModeChange(intent.key)}
              >
                <Ionicons
                  name={intent.icon}
                  size={14}
                  color={isActive ? intent.color : '#9CA3AF'}
                />
                <Text style={[styles.intentChipText, isActive && { color: intent.color }]}>
                  {label}
                </Text>
                {intent.key === 'custom' && selectedTags.length > 0 && (
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); setSelectedTags([]); setActiveMode('tonight'); }}
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={14} color={intent.color} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Generating banner */}
      {generating && activeTab === 'suggestions' && (
        <View style={styles.generatingBanner}>
          <ActivityIndicator size="small" color="#F59E0B" />
          <Text style={styles.generatingBannerText}>{t('recipes.generating')}</Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#FF8400" size="large" />
        </View>
      ) : activeTab === 'suggestions' ? (
        filteredSuggestions.length === 0 ? (
          <View style={styles.emptyState}>
            {generating ? (
              <ActivityIndicator color="#FF8400" size="large" />
            ) : emptyState.icon ? (
              <Ionicons name={emptyState.icon} size={44} color="#D1D5DB" />
            ) : null}
            <Text style={styles.emptyTitle}>{emptyState.title}</Text>
            <Text style={styles.emptySubtitle}>{emptyState.sub}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredSuggestions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SuggestionCard
                item={item}
                mode={activeMode}
                matchCount={recipeMatchCounts?.get(item.id) ?? 0}
                totalActiveTags={activeTags.length}
              />
            )}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={refetch}
            ListFooterComponent={
              <TouchableOpacity
                style={[styles.generateMoreBtn, generating && styles.generateMoreBtnDisabled]}
                onPress={generateMore}
                disabled={generating}
              >
                {generating
                  ? <ActivityIndicator size="small" color="#FF8400" />
                  : <Ionicons name="sparkles-outline" size={15} color="#FF8400" />
                }
                <Text style={styles.generateMoreText}>{t('recipes.generateMore')}</Text>
              </TouchableOpacity>
            }
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

      <IngredientPickerSheet
        visible={pickerVisible}
        selectedTags={selectedTags}
        onClose={() => setPickerVisible(false)}
        onConfirm={handlePickerConfirm}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F3F0' },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: '#111111' },

  // Tab bar
  tabBar: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, borderRadius: 10,
  },
  tabActive: { backgroundColor: '#FFF3E0' },
  tabLabel: { fontSize: 13, fontWeight: '500', color: '#9CA3AF' },
  tabLabelActive: { color: '#FF8400', fontWeight: '600' },
  tabBadge: { backgroundColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeActive: { backgroundColor: '#FDBA74' },
  tabBadgeText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  tabBadgeTextActive: { color: '#FFFFFF' },

  // Intent chips
  intentsScroll: { flexGrow: 0, marginBottom: 10 },
  intentsRow: { paddingHorizontal: 16, gap: 8 },
  intentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  intentChipText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },

  // Generating banner
  generatingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#FFF3E0', borderRadius: 10,
  },
  generatingBannerText: { fontSize: 13, color: '#B45309', fontWeight: '500', flex: 1 },

  // Cards
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 14, gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111111' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Generic badge (replaces individual score/match badges)
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, maxWidth: 140 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Time chip
  timeChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeChipText: { fontSize: 12, color: '#9CA3AF' },

  // Missing chips
  missingChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  missingChipText: { fontSize: 12, color: '#EF4444' },
  missingMore: { fontSize: 12, color: '#9CA3AF' },

  // Generate more button
  generateMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 16, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#FF8400', borderStyle: 'dashed',
  },
  generateMoreBtnDisabled: { opacity: 0.5 },
  generateMoreText: { fontSize: 13, fontWeight: '600', color: '#FF8400' },

  // States
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
});
