import { useCallback } from 'react';
import {
  ActivityIndicator,
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
import { useHomeData, type ExpiringItem, type RecentItem } from '@/features/stock/hooks/useHomeData';

const LIEU_ICON: Record<string, string> = {
  frigo: 'snow-outline',
  placard: 'cube-outline',
  congelateur: 'thermometer-outline',
};

function expiryStyle(daysLeft: number): { color: string; bg: string; label: string } {
  if (daysLeft < 0) return { color: '#EF4444', bg: '#FEE2E2', label: 'Expiré' };
  if (daysLeft === 0) return { color: '#EF4444', bg: '#FEE2E2', label: "Auj." };
  if (daysLeft === 1) return { color: '#EF4444', bg: '#FEE2E2', label: 'Demain' };
  return { color: '#EF4444', bg: '#FEE2E2', label: `J-${daysLeft}` };
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const { data, loading, refetch } = useHomeData();

  useFocusEffect(useCallback(() => { refetch(); }, []));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('home.title')}</Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#FF8400" size="large" />
          </View>
        ) : (
          <>
            {/* Expire bientôt */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                <Text style={styles.sectionTitle}>{t('home.expiringSoon')}</Text>
              </View>

              {data.expiring.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="checkmark-circle-outline" size={28} color="#16A34A" />
                  <Text style={styles.emptyCardText}>{t('home.nothingExpiring')}</Text>
                </View>
              ) : (
                <View style={styles.expiringList}>
                  {data.expiring.map((item) => (
                    <ExpiringCard key={item.id} item={item} />
                  ))}
                </View>
              )}
            </View>

            {/* CTA recettes */}
            <TouchableOpacity
              style={styles.recipeBtn}
              onPress={() => router.push('/(tabs)/recipes')}
            >
              <View style={styles.recipeBtnLeft}>
                <Text style={styles.recipeBtnTitle}>{t('home.cookingCta')}</Text>
                <Text style={styles.recipeBtnSub}>{t('home.cookingCtaSub')}</Text>
              </View>
              <View style={styles.recipeBtnIcon}>
                <Ionicons name="restaurant-outline" size={26} color="#FF8400" />
              </View>
            </TouchableOpacity>

            {/* Derniers ajouts */}
            {data.recent.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="time-outline" size={18} color="#6B7280" />
                  <Text style={styles.sectionTitle}>{t('home.recentlyAdded')}</Text>
                </View>
                <View style={styles.recentList}>
                  {data.recent.map((item, index) => (
                    <RecentCard key={item.id} item={item} last={index === data.recent.length - 1} />
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ExpiringCard({ item }: { item: ExpiringItem }) {
  const style = expiryStyle(item.daysLeft);
  return (
    <View style={styles.expiringCard}>
      <View style={[styles.expiryBadge, { backgroundColor: style.bg }]}>
        <Text style={[styles.expiryBadgeText, { color: style.color }]}>{style.label}</Text>
      </View>
      <Text style={styles.expiringName} numberOfLines={1}>{item.nom}</Text>
      <Ionicons name={LIEU_ICON[item.lieu] as any} size={14} color="#9CA3AF" />
    </View>
  );
}

function RecentCard({ item, last }: { item: RecentItem; last: boolean }) {
  return (
    <View style={[styles.recentCard, !last && styles.recentCardBorder]}>
      <Ionicons name={LIEU_ICON[item.lieu] as any} size={16} color="#9CA3AF" />
      <Text style={styles.recentName} numberOfLines={1}>{item.nom}</Text>
      <Text style={styles.recentQty}>
        {item.quantite % 1 === 0 ? item.quantite : item.quantite.toFixed(1)}{' '}
        <Text style={styles.recentUnite}>{item.unite}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F3F0' },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },

  header: { paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: '#111111' },

  // Section
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Expiring
  expiringList: { gap: 8 },
  expiringCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  expiryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    minWidth: 52,
    alignItems: 'center',
  },
  expiryBadgeText: { fontSize: 12, fontWeight: '700' },
  expiringName: { flex: 1, fontSize: 15, fontWeight: '500', color: '#111111' },

  // Empty expiring card
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  emptyCardText: { fontSize: 14, color: '#374151' },

  // Recipe CTA
  recipeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#FF8400',
  },
  recipeBtnLeft: { flex: 1, gap: 3 },
  recipeBtnTitle: { fontSize: 17, fontWeight: '700', color: '#111111' },
  recipeBtnSub: { fontSize: 13, color: '#6B7280' },
  recipeBtnIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Recent
  recentList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  recentCardBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recentName: { flex: 1, fontSize: 14, color: '#111111' },
  recentQty: { fontSize: 13, fontWeight: '600', color: '#374151' },
  recentUnite: { fontWeight: '400', color: '#6B7280' },
});
