import React, { memo } from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { Badge } from '@/components/atoms/Badge';
import { colors, spacing, radius } from '@/lib/theme';

type ColorScheme = 'light' | 'dark';

interface ProductCardProps {
  name: string;
  quantity: number;
  unit: string;
  daysLeft?: number;
  placeholderColor?: string;
  onPress?: () => void;
  scheme?: ColorScheme;
  style?: ViewStyle;
}

const PLACEHOLDER_COLORS = [
  '#FFE0CC', '#FFD6CC', '#FFEACC', '#E8F5E9',
  '#E3F2FD', '#F3E5F5', '#FFF9C4', '#FCE4EC',
];

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PLACEHOLDER_COLORS[Math.abs(hash) % PLACEHOLDER_COLORS.length];
}

export const ProductCard = memo(function ProductCard({
  name,
  quantity,
  unit,
  daysLeft,
  placeholderColor,
  onPress,
  scheme = 'light',
  style,
}: ProductCardProps) {
  const bgColor = placeholderColor ?? hashColor(name);
  const theme = colors[scheme];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.surface, opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {/* Badge expiry — coin supérieur droit */}
      {daysLeft !== undefined && daysLeft <= 7 && (
        <View style={styles.badgeContainer}>
          <Badge daysLeft={daysLeft} scheme={scheme} />
        </View>
      )}

      {/* Placeholder image */}
      <View style={[styles.imagePlaceholder, { backgroundColor: bgColor }]} />

      {/* Nom */}
      <Text
        variant="label"
        scheme={scheme}
        style={styles.name}
        numberOfLines={2}
      >
        {name}
      </Text>

      {/* Quantité */}
      <Text
        variant="quantity"
        color={theme.text.muted}
        style={styles.quantity}
        numberOfLines={1}
      >
        {quantity} {unit}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  badgeContainer: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    zIndex: 1,
  },
  imagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    marginBottom: 2,
  },
  name: {
    textAlign: 'center',
    lineHeight: 16,
  },
  quantity: {
    fontSize: 11,
    textAlign: 'center',
  },
});
