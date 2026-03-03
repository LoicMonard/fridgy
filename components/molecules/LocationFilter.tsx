import React, { memo } from 'react';
import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Refrigerator, Package, Snowflake, LayoutGrid } from 'lucide-react-native';
import { LucideIcon } from 'lucide-react-native';
import { Text } from '@/components/atoms/Text';
import { colors, spacing, radius } from '@/lib/theme';
import { useTranslation } from 'react-i18next';
import { StockLocation } from '@/features/stock/types';

type ColorScheme = 'light' | 'dark';
type FilterValue = StockLocation | 'all';

interface FilterOption {
  value: FilterValue;
  labelKey: string;
  icon: LucideIcon;
}

const FILTER_OPTIONS: FilterOption[] = [
  { value: 'all',        labelKey: 'stock.all',        icon: LayoutGrid  },
  { value: 'frigo',      labelKey: 'stock.frigo',      icon: Refrigerator },
  { value: 'placard',    labelKey: 'stock.placard',     icon: Package     },
  { value: 'congelateur',labelKey: 'stock.congelateur', icon: Snowflake   },
];

interface LocationFilterProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  scheme?: ColorScheme;
}

export const LocationFilter = memo(function LocationFilter({
  value,
  onChange,
  scheme = 'light',
}: LocationFilterProps) {
  const { t } = useTranslation();
  const theme = colors[scheme];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {FILTER_OPTIONS.map(({ value: optionValue, labelKey, icon: Icon }) => {
        const isActive = value === optionValue;
        const { activeBg, activeColor, inactiveBg, inactiveColor } = theme.iconButton;

        return (
          <Pressable
            key={optionValue}
            onPress={() => onChange(optionValue)}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: isActive ? activeBg : inactiveBg,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Icon
              size={18}
              color={isActive ? activeColor : inactiveColor}
              strokeWidth={1.75}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scrollContent: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
