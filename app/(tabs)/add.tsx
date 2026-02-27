import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { addReceiptItemsToStock } from '@/features/stock/services/stockService';
import type { ReceiptItemDraft } from '@/features/scanning/types';

const MOCK_RECEIPT_ITEMS = [
  { nom: 'Lait demi-écrémé 1L', ingredientTag: 'lait', quantiteEstimee: 1, unite: 'unite', dureeConservationJours: 7 },
  { nom: 'Yaourt aux fruits 4x125g', ingredientTag: 'yaourt', quantiteEstimee: 4, unite: 'unite', dureeConservationJours: 21 },
  { nom: 'Beurre doux 250g', ingredientTag: 'beurre', quantiteEstimee: 1, unite: 'unite', dureeConservationJours: 30 },
  { nom: 'Emmental râpé 200g', ingredientTag: 'fromage', quantiteEstimee: 200, unite: 'g', dureeConservationJours: 14 },
  { nom: 'Poulet rôti', ingredientTag: 'poulet', quantiteEstimee: 1, unite: 'unite', dureeConservationJours: 3 },
  { nom: 'Carottes 1kg', ingredientTag: 'carotte', quantiteEstimee: 1, unite: 'kg', dureeConservationJours: 14 },
  { nom: 'Pâtes fusilli 500g', ingredientTag: 'pates', quantiteEstimee: 500, unite: 'g', dureeConservationJours: null },
  { nom: 'Sauce tomate basilic', ingredientTag: 'sauce_tomate', quantiteEstimee: 1, unite: 'unite', dureeConservationJours: 5 },
];

const MOCK_KITCHEN_STOCK: ReceiptItemDraft[] = [
  // Légumes (frigo)
  { nom: 'Carottes', ingredientTag: 'carotte', quantite: 1, unite: 'kg', lieu: 'frigo' },
  { nom: 'Tomates', ingredientTag: 'tomate', quantite: 6, unite: 'pièce', lieu: 'frigo' },
  { nom: 'Oignons', ingredientTag: 'oignon', quantite: 3, unite: 'pièce', lieu: 'placard' },
  { nom: 'Ail', ingredientTag: 'ail', quantite: 1, unite: 'pièce', lieu: 'placard' },
  { nom: 'Courgettes', ingredientTag: 'courgette', quantite: 2, unite: 'pièce', lieu: 'frigo' },
  { nom: 'Poivrons', ingredientTag: 'poivron', quantite: 2, unite: 'pièce', lieu: 'frigo' },
  { nom: 'Épinards', ingredientTag: 'epinard', quantite: 200, unite: 'g', lieu: 'frigo' },
  { nom: 'Champignons', ingredientTag: 'champignon', quantite: 250, unite: 'g', lieu: 'frigo' },
  { nom: 'Pommes de terre', ingredientTag: 'pomme_de_terre', quantite: 1, unite: 'kg', lieu: 'placard' },
  { nom: 'Poireaux', ingredientTag: 'poireau', quantite: 2, unite: 'pièce', lieu: 'frigo' },
  // Viandes (frigo)
  { nom: 'Filets de poulet', ingredientTag: 'poulet', quantite: 2, unite: 'pièce', lieu: 'frigo', dureeConservationJours: 3 },
  { nom: 'Boeuf haché', ingredientTag: 'boeuf', quantite: 400, unite: 'g', lieu: 'frigo', dureeConservationJours: 2 },
  { nom: 'Lardons', ingredientTag: 'lardons', quantite: 200, unite: 'g', lieu: 'frigo', dureeConservationJours: 7 },
  { nom: 'Jambon', ingredientTag: 'jambon', quantite: 4, unite: 'pièce', lieu: 'frigo', dureeConservationJours: 5 },
  // Poissons (congélateur)
  { nom: 'Saumon', ingredientTag: 'saumon', quantite: 2, unite: 'pièce', lieu: 'congelateur' },
  { nom: 'Thon en conserve', ingredientTag: 'thon', quantite: 2, unite: 'boîte', lieu: 'placard' },
  // Produits laitiers (frigo)
  { nom: 'Lait', ingredientTag: 'lait', quantite: 1, unite: 'L', lieu: 'frigo', dureeConservationJours: 7 },
  { nom: 'Beurre', ingredientTag: 'beurre', quantite: 1, unite: 'pièce', lieu: 'frigo', dureeConservationJours: 30 },
  { nom: 'Crème fraîche', ingredientTag: 'creme', quantite: 20, unite: 'cl', lieu: 'frigo', dureeConservationJours: 10 },
  { nom: 'Fromage râpé', ingredientTag: 'fromage', quantite: 200, unite: 'g', lieu: 'frigo', dureeConservationJours: 14 },
  { nom: 'Oeufs', ingredientTag: 'oeuf', quantite: 6, unite: 'pièce', lieu: 'frigo', dureeConservationJours: 28 },
  // Féculents (placard)
  { nom: 'Pâtes', ingredientTag: 'pates', quantite: 500, unite: 'g', lieu: 'placard' },
  { nom: 'Riz', ingredientTag: 'riz', quantite: 500, unite: 'g', lieu: 'placard' },
  { nom: 'Farine', ingredientTag: 'farine', quantite: 500, unite: 'g', lieu: 'placard' },
  // Légumineuses (placard)
  { nom: 'Lentilles', ingredientTag: 'lentille', quantite: 500, unite: 'g', lieu: 'placard' },
  { nom: 'Pois chiches', ingredientTag: 'pois_chiche', quantite: 400, unite: 'g', lieu: 'placard' },
  // Condiments (placard)
  { nom: 'Huile d\'olive', ingredientTag: 'huile_olive', quantite: 1, unite: 'L', lieu: 'placard' },
  { nom: 'Sauce tomate', ingredientTag: 'sauce_tomate', quantite: 2, unite: 'boîte', lieu: 'placard' },
  { nom: 'Concentré de tomate', ingredientTag: 'concentre_tomate', quantite: 1, unite: 'boîte', lieu: 'placard' },
  { nom: 'Moutarde', ingredientTag: 'moutarde', quantite: 1, unite: 'pièce', lieu: 'placard' },
  { nom: 'Sauce soja', ingredientTag: 'sauce_soja', quantite: 1, unite: 'pièce', lieu: 'placard' },
  // Épices (placard)
  { nom: 'Sel', ingredientTag: 'sel', quantite: 1, unite: 'pièce', lieu: 'placard' },
  { nom: 'Poivre', ingredientTag: 'poivre', quantite: 1, unite: 'pièce', lieu: 'placard' },
  { nom: 'Herbes de Provence', ingredientTag: 'herbes_de_provence', quantite: 1, unite: 'pièce', lieu: 'placard' },
  { nom: 'Cumin', ingredientTag: 'cumin', quantite: 1, unite: 'pièce', lieu: 'placard' },
  { nom: 'Curry', ingredientTag: 'curry', quantite: 1, unite: 'pièce', lieu: 'placard' },
  { nom: 'Paprika', ingredientTag: 'paprika', quantite: 1, unite: 'pièce', lieu: 'placard' },
];

export default function AddScreen() {
  const { t } = useTranslation();
  const [loadingMock, setLoadingMock] = useState(false);

  async function handleAddKitchenStock() {
    setLoadingMock(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: membre } = await supabase
        .from('foyer_membres')
        .select('foyer_id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (!membre?.foyer_id) return;
      await addReceiptItemsToStock(MOCK_KITCHEN_STOCK, membre.foyer_id as string, session.user.id);
      Alert.alert('Stock ajouté', `${MOCK_KITCHEN_STOCK.length} ingrédients ajoutés au stock.`);
    } catch (e) {
      Alert.alert('Erreur', String(e));
    } finally {
      setLoadingMock(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('add.title')}</Text>
      </View>
      <View style={styles.options}>
        <TouchableOpacity style={styles.option} onPress={() => router.push('/add/scan-barcode')}>
          <View style={[styles.iconBox, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="barcode-outline" size={26} color="#FF8400" />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{t('add.scan')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={() => router.push('/add/scan-receipt')}>
          <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="receipt-outline" size={26} color="#1565C0" />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{t('add.scanReceipt')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>

        {/* DEBUG ONLY — remove before release */}
        <TouchableOpacity
          style={[styles.option, styles.debugOption]}
          onPress={() => router.push({ pathname: '/add/receipt-confirm', params: { items: JSON.stringify(MOCK_RECEIPT_ITEMS) } })}
        >
          <View style={[styles.iconBox, { backgroundColor: '#FFF8E1' }]}>
            <Ionicons name="bug-outline" size={26} color="#F59E0B" />
          </View>
          <View style={styles.optionText}>
            <Text style={[styles.optionTitle, { color: '#F59E0B' }]}>Simuler un ticket de caisse</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={() => router.push('/add/manual-product')}>
          <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="pencil-outline" size={26} color="#2E7D32" />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{t('add.manual')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>

        {/* DEBUG ONLY — remove before release */}
        <TouchableOpacity
          style={[styles.option, styles.debugOption, loadingMock && { opacity: 0.6 }]}
          onPress={handleAddKitchenStock}
          disabled={loadingMock}
        >
          <View style={[styles.iconBox, { backgroundColor: '#F3F4F6' }]}>
            {loadingMock
              ? <ActivityIndicator size="small" color="#6B7280" />
              : <Ionicons name="flask-outline" size={26} color="#6B7280" />
            }
          </View>
          <View style={styles.optionText}>
            <Text style={[styles.optionTitle, { color: '#6B7280' }]}>Remplir stock de test</Text>
            <Text style={styles.optionSub}>Ajoute ~36 ingrédients communs</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F3F0' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#111111' },
  options: { paddingHorizontal: 20, gap: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#111111' },
  optionSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  debugOption: { borderWidth: 1, borderColor: '#FDE68A', borderStyle: 'dashed' },
});
