import React, { memo } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { colors, spacing, radius, fontSize, fontFamily } from '@/lib/theme';
import { useTranslation } from 'react-i18next';

type ColorScheme = 'light' | 'dark';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onFilterPress?: () => void;
  scheme?: ColorScheme;
}

export const SearchBar = memo(function SearchBar({
  value,
  onChangeText,
  onFilterPress,
  scheme = 'light',
}: SearchBarProps) {
  const { t } = useTranslation();
  const theme = colors[scheme];

  return (
    <View style={styles.row}>
      {/* Input */}
      <View style={[styles.inputContainer, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
        <Search size={16} color={theme.text.muted} strokeWidth={1.75} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={t('stock.searchPlaceholder')}
          placeholderTextColor={theme.text.muted}
          style={[styles.input, { color: theme.text.primary }]}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Bouton filtre */}
      {onFilterPress && (
        <Pressable
          onPress={onFilterPress}
          style={({ pressed }) => [
            styles.filterButton,
            {
              backgroundColor: theme.primaryBg,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <SlidersHorizontal size={18} color={theme.primary} strokeWidth={1.75} />
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    height: '100%',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
