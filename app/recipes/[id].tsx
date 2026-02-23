import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { cookRecipe } from '@/features/stock/services/stockService';

interface RecipeIngredient {
  ingredient_tag: string;
  quantite_totale: number;
  unite: string;
  est_optionnel: boolean;
  available: boolean;
}

interface RecipeDetail {
  id: string;
  titre: string;
  tempsPrepMin: number | null;
  tempsCuissonMin: number | null;
  portionsBase: number;
  preferences: string[];
  instructions: { etape: number; texte: string }[];
  ingredients: RecipeIngredient[];
}

export default function RecipeDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [cooking, setCooking] = useState(false);
  const [foyerId, setFoyerId] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadRecipe(id);
  }, [id]);

  async function loadRecipe(recipeId: string) {
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
      const foyer = membre.foyer_id as string;
      setFoyerId(foyer);

      const [recipeRes, ingRes, stockRes, favRes] = await Promise.all([
        supabase
          .from('recettes')
          .select('id, titre, temps_prep_min, temps_cuisson_min, portions_base, preferences, instructions_json')
          .eq('id', recipeId)
          .single(),
        supabase
          .from('recette_ingredients')
          .select('ingredient_tag, quantite_totale, unite, est_optionnel')
          .eq('recette_id', recipeId),
        supabase
          .from('stock_items')
          .select('ingredient_tag')
          .eq('foyer_id', foyer)
          .not('ingredient_tag', 'is', null),
        supabase
          .from('foyer_recettes_favorites')
          .select('recette_id')
          .eq('foyer_id', foyer)
          .eq('recette_id', recipeId)
          .maybeSingle(),
      ]);

      if (!recipeRes.data) return;

      const stockTags = new Set(
        (stockRes.data ?? []).map((s) => s.ingredient_tag as string),
      );

      const r = recipeRes.data;
      setRecipe({
        id: r.id as string,
        titre: r.titre as string,
        tempsPrepMin: r.temps_prep_min as number | null,
        tempsCuissonMin: r.temps_cuisson_min as number | null,
        portionsBase: r.portions_base as number,
        preferences: (r.preferences as string[]) ?? [],
        instructions: (r.instructions_json as { etape: number; texte: string }[]) ?? [],
        ingredients: (ingRes.data ?? []).map((i) => ({
          ingredient_tag: i.ingredient_tag as string,
          quantite_totale: Number(i.quantite_totale),
          unite: i.unite as string,
          est_optionnel: i.est_optionnel as boolean,
          available: stockTags.has(i.ingredient_tag as string),
        })),
      });

      setIsFavorite(!!favRes.data);
    } finally {
      setLoading(false);
    }
  }

  async function toggleFavorite() {
    if (!recipe || !foyerId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (isFavorite) {
      await supabase
        .from('foyer_recettes_favorites')
        .delete()
        .eq('foyer_id', foyerId)
        .eq('recette_id', recipe.id);
    } else {
      await supabase
        .from('foyer_recettes_favorites')
        .insert({ foyer_id: foyerId, recette_id: recipe.id, saved_by: session.user.id });
    }
    setIsFavorite(!isFavorite);
  }

  async function handleCook() {
    if (!recipe || !foyerId) return;

    const available = recipe.ingredients.filter((i) => !i.est_optionnel && i.available);
    if (available.length === 0) {
      Alert.alert(t('recipeDetail.cookNoIngredients'));
      return;
    }

    const lines = available
      .map((i) => `• ${i.ingredient_tag} — ${i.quantite_totale} ${i.unite}`)
      .join('\n');

    Alert.alert(
      t('recipeDetail.cookConfirmTitle'),
      `${t('recipeDetail.cookConfirmBody')}\n\n${lines}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('recipeDetail.cookConfirm'),
          onPress: async () => {
            setCooking(true);
            try {
              await cookRecipe(available, foyerId);
              Alert.alert(t('recipeDetail.cookSuccess'), '', [
                { text: 'OK', onPress: () => router.replace('/(tabs)/stock') },
              ]);
            } catch {
              Alert.alert(t('common.error'));
            } finally {
              setCooking(false);
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color="#FF8400" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t('common.error')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalMin = (recipe.tempsPrepMin ?? 0) + (recipe.tempsCuissonMin ?? 0);
  const required = recipe.ingredients.filter((i) => !i.est_optionnel);
  const optional = recipe.ingredients.filter((i) => i.est_optionnel);
  const missingCount = required.filter((i) => !i.available).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#111111" />
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleFavorite} style={styles.iconBtn}>
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={24}
            color={isFavorite ? '#EF4444' : '#6B7280'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title + meta */}
        <Text style={styles.title}>{recipe.titre}</Text>
        <View style={styles.metaRow}>
          {totalMin > 0 && (
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={14} color="#6B7280" />
              <Text style={styles.metaText}>{totalMin} min</Text>
            </View>
          )}
          <View style={styles.metaChip}>
            <Ionicons name="people-outline" size={14} color="#6B7280" />
            <Text style={styles.metaText}>{recipe.portionsBase} pers.</Text>
          </View>
          {missingCount > 0 && (
            <View style={[styles.metaChip, styles.metaChipAlert]}>
              <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
              <Text style={[styles.metaText, { color: '#EF4444' }]}>
                {missingCount} manquant{missingCount > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('recipeDetail.ingredients')}</Text>
          <View style={styles.card}>
            {required.map((ing) => (
              <IngredientRow key={ing.ingredient_tag} ing={ing} />
            ))}
            {optional.map((ing) => (
              <IngredientRow key={ing.ingredient_tag} ing={ing} />
            ))}
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('recipeDetail.instructions')}</Text>
          <View style={styles.card}>
            {recipe.instructions.map((step, idx) => (
              <View
                key={step.etape}
                style={[styles.step, idx < recipe.instructions.length - 1 && styles.stepBorder]}
              >
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{step.etape}</Text>
                </View>
                <Text style={styles.stepText}>{step.texte}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cookBtn, cooking && styles.cookBtnDisabled]}
          onPress={handleCook}
          disabled={cooking}
        >
          {cooking ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="restaurant-outline" size={20} color="#FFFFFF" />
              <Text style={styles.cookBtnText}>{t('recipeDetail.cookCta')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function IngredientRow({ ing }: { item?: never; ing: RecipeIngredient }) {
  const label = ing.ingredient_tag.replace(/_/g, ' ');
  const qty = ing.quantite_totale % 1 === 0
    ? ing.quantite_totale
    : ing.quantite_totale.toFixed(1);
  return (
    <View style={[styles.ingRow, ing.est_optionnel && styles.ingRowOptional]}>
      <Ionicons
        name={ing.available ? 'checkmark-circle' : 'close-circle-outline'}
        size={18}
        color={ing.available ? '#16A34A' : '#EF4444'}
      />
      <Text style={[styles.ingName, !ing.available && styles.ingNameMissing]}>
        {label}
        {ing.est_optionnel ? ' (opt.)' : ''}
      </Text>
      <Text style={styles.ingQty}>{qty} {ing.unite}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F3F0' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, color: '#6B7280' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn: { padding: 4 },

  content: { paddingHorizontal: 16, paddingBottom: 16, gap: 20 },

  title: { fontSize: 22, fontWeight: '700', color: '#111111', lineHeight: 30 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaChipAlert: { backgroundColor: '#FEE2E2' },
  metaText: { fontSize: 13, color: '#6B7280' },

  section: { gap: 10 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
  },

  // Ingredient row
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  ingRowOptional: { opacity: 0.65 },
  ingName: {
    flex: 1,
    fontSize: 14,
    color: '#111111',
    textTransform: 'capitalize',
  },
  ingNameMissing: { color: '#EF4444' },
  ingQty: { fontSize: 13, color: '#6B7280' },

  // Step
  step: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  stepBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumberText: { fontSize: 13, fontWeight: '700', color: '#FF8400' },
  stepText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 22 },

  // Footer CTA
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F3F0',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF8400',
    borderRadius: 14,
    padding: 16,
  },
  cookBtnDisabled: { opacity: 0.6 },
  cookBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
