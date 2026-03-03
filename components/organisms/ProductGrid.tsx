import React, { memo, useCallback, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { SectionHeader } from '@/components/molecules/SectionHeader';
import { ProductCard } from '@/components/molecules/ProductCard';
import { Text } from '@/components/atoms/Text';
import { colors, spacing } from '@/lib/theme';
import { StockItemDisplay } from '@/features/stock/hooks/useStock';

type ColorScheme = 'light' | 'dark';

interface ProductSection {
  title: string;
  data: StockItemDisplay[];
}

interface ProductGridProps {
  sections: ProductSection[];
  onItemPress?: (item: StockItemDisplay) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  emptyComponent?: React.ReactElement;
  scheme?: ColorScheme;
}

const NUM_COLUMNS = 4;
const CARD_GAP = spacing.sm;

function computeDaysLeft(dateStr: string | null): number | undefined {
  if (!dateStr) return undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  return Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);
}

// Rembourre une ligne pour avoir toujours NUM_COLUMNS items
function padRow(row: StockItemDisplay[]): (StockItemDisplay | null)[] {
  const padded: (StockItemDisplay | null)[] = [...row];
  while (padded.length % NUM_COLUMNS !== 0) padded.push(null);
  return padded;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

interface CollapsibleSectionProps {
  section: ProductSection;
  cardWidth: number;
  onItemPress?: (item: StockItemDisplay) => void;
  scheme: ColorScheme;
}

const CollapsibleSection = memo(function CollapsibleSection({
  section,
  cardWidth,
  onItemPress,
  scheme,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const animHeight = React.useRef(new Animated.Value(1)).current;

  const handleToggle = useCallback(() => {
    Animated.timing(animHeight, {
      toValue: expanded ? 0 : 1,
      duration: 220,
      useNativeDriver: false,
    }).start();
    setExpanded((v) => !v);
  }, [expanded, animHeight]);

  const rows = chunkArray(section.data, NUM_COLUMNS);

  return (
    <View style={styles.section}>
      <SectionHeader
        title={section.title}
        isExpanded={expanded}
        onToggle={handleToggle}
        scheme={scheme}
      />
      <Animated.View style={{ overflow: 'hidden', opacity: animHeight }}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {padRow(row).map((item, colIndex) =>
              item ? (
                <ProductCard
                  key={item.id}
                  name={item.nom}
                  quantity={item.quantite}
                  unit={item.unite}
                  daysLeft={computeDaysLeft(item.datePeremption)}
                  onPress={() => onItemPress?.(item)}
                  scheme={scheme}
                  style={{ width: cardWidth }}
                />
              ) : (
                <View key={`empty-${rowIndex}-${colIndex}`} style={{ width: cardWidth }} />
              )
            )}
          </View>
        ))}
      </Animated.View>
    </View>
  );
});

export const ProductGrid = memo(function ProductGrid({
  sections,
  onItemPress,
  refreshing = false,
  onRefresh,
  emptyComponent,
  scheme = 'light',
}: ProductGridProps) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - spacing.lg * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  if (sections.length === 0 && emptyComponent) {
    return emptyComponent;
  }

  return (
    <FlatList
      data={sections}
      keyExtractor={(item) => item.title}
      renderItem={({ item: section }) => (
        <CollapsibleSection
          section={section}
          cardWidth={cardWidth}
          onItemPress={onItemPress}
          scheme={scheme}
        />
      )}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
});

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
});
